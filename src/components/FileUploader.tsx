import { useState, useRef, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Image, Video } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { toast } from "sonner";

const FILE_SIZE_LIMITS: Record<string, number> = {
  "image/*": 10 * 1024 * 1024,      // 10MB
  "video/mp4": 100 * 1024 * 1024,   // 100MB
  "application/pdf": 20 * 1024 * 1024, // 20MB
  "*": 50 * 1024 * 1024,            // 50MB default
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Video;
  if (type === "application/pdf") return FileText;
  return FileText;
};

interface FileUploaderProps {
  onUploadSuccess: (url: string) => void;
  folder?: string;
  allowedTypes?: string;
  label?: string;
  maxSizeMB?: number;
}

export const FileUploader = ({
  onUploadSuccess,
  folder = "uploads",
  allowedTypes = "*",
  label = "Upload File",
  maxSizeMB,
}: FileUploaderProps) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (allowedTypes !== "*") {
      const allowed = allowedTypes.split(",").map(t => t.trim());
      const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
      const matchesType = allowed.some(t => {
        if (t.startsWith(".")) return fileExt === t.toLowerCase();
        if (t.endsWith("/*")) return file.type.startsWith(t.replace("/*", "/"));
        return file.type === t;
      });
      if (!matchesType) {
        return `Unsupported file type. Allowed: ${allowedTypes}`;
      }
    }

    // Check file size
    const limit = maxSizeMB
      ? maxSizeMB * 1024 * 1024
      : FILE_SIZE_LIMITS[allowedTypes] || FILE_SIZE_LIMITS["*"];
    if (file.size > limit) {
      return `File too large. Maximum size: ${formatFileSize(limit)}`;
    }

    return null;
  }, [allowedTypes, maxSizeMB]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setErrorMsg(error);
      setStatus("error");
      toast.error(error);
      return;
    }

    setErrorMsg("");
    uploadFile(file);
  };

  const uploadFile = (file: File) => {
    setFileName(file.name);
    setFileSize(formatFileSize(file.size));
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");

    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(percent);
      },
      (error) => {
        console.error("Upload error:", error);
        setStatus("error");
        setProgress(null);

        // Parse Firebase Storage errors
        let message = "Upload failed. Please try again.";
        if (error.code === "storage/unauthorized") {
          message = "Permission denied. Check Firebase Storage rules.";
        } else if (error.code === "storage/canceled") {
          message = "Upload was canceled.";
        } else if (error.code === "storage/quota-exceeded") {
          message = "Storage quota exceeded. Free up space first.";
        } else if (error.code === "storage/invalid-argument") {
          message = "Invalid file. Try a different file.";
        } else if (error.serverResponse) {
          message = `Server error (${error.serverResponse}). Check network and try again.`;
        }

        setErrorMsg(message);
        toast.error(message);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setStatus("success");
          setProgress(null);
          onUploadSuccess(downloadUrl);
          toast.success(`${fileName} uploaded successfully!`);

          // Reset status after 3 seconds
          setTimeout(() => {
            setStatus("idle");
            setFileName("");
            setFileSize("");
          }, 3000);
        } catch (e: any) {
          setStatus("error");
          setErrorMsg("Failed to get download URL. Check Firebase Storage rules.");
          toast.error("Failed to get download URL. Check Firebase Storage rules.");
        }
      }
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setErrorMsg(error);
      setStatus("error");
      toast.error(error);
      return;
    }

    setErrorMsg("");
    uploadFile(file);
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setStatus("idle");
    setFileName("");
    setFileSize("");
    setErrorMsg("");
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const StatusIcon = status === "uploading"
    ? Loader2
    : status === "success"
    ? CheckCircle
    : status === "error"
    ? AlertCircle
    : Upload;

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={allowedTypes}
        className="hidden"
      />

      <div
        onClick={status !== "uploading" ? triggerSelect : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-2xl p-5 transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer
          ${isDragOver
            ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
            : status === "error"
            ? "border-red-300 bg-red-500/5 hover:border-red-400"
            : status === "success"
            ? "border-green-300 bg-green-500/5"
            : "border-stone-200 hover:border-amber-400 bg-white/20 hover:bg-white/40"
          }
          ${status === "uploading" ? "cursor-wait" : ""}
        `}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            status === "success" ? "bg-green-100" : status === "error" ? "bg-red-100" : "bg-amber-100/50"
          }`}>
            <StatusIcon
              size={18}
              className={`${
                status === "uploading" ? "text-amber-500 animate-spin" :
                status === "success" ? "text-green-500" :
                status === "error" ? "text-red-500" :
                "text-amber-500"
              }`}
            />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-700 uppercase tracking-wider">{label}</p>
            <p className="text-[10px] text-stone-500 truncate">
              {status === "idle" && "Drag & drop or click to browse"}
              {status === "uploading" && `Uploading ${fileName}... ${progress}%`}
              {status === "success" && `${fileName} (${fileSize})`}
              {status === "error" && (errorMsg || "Upload failed. Click to retry")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {progress !== null && status === "uploading" && (
            <div className="w-20 bg-stone-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-1.5 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {status === "success" && (
            <CheckCircle size={16} className="text-green-500" />
          )}

          {status === "error" && (
            <button
              onClick={(e) => { e.stopPropagation(); resetUpload(); }}
              className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
            >
              <X size={14} className="text-red-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

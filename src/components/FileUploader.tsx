import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { toast } from "sonner";

interface FileUploaderProps {
  onUploadSuccess: (url: string) => void;
  folder?: string;
  allowedTypes?: string;
  label?: string;
}

export const FileUploader = ({ 
  onUploadSuccess, 
  folder = "uploads", 
  allowedTypes = "*", 
  label = "Upload File" 
}: FileUploaderProps) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  };

  const uploadFile = (file: File) => {
    setFileName(file.name);
    setStatus("uploading");
    setProgress(0);

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
        toast.error(`Upload failed: ${error.message}`);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setStatus("success");
          setProgress(null);
          onUploadSuccess(downloadUrl);
          toast.success("File uploaded successfully!");
        } catch (e: any) {
          setStatus("error");
          toast.error("Failed to get download URL");
        }
      }
    );
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

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
        onClick={triggerSelect}
        className="border border-dashed border-stone-300 hover:border-amber-500 rounded-2xl p-4 bg-white/20 hover:bg-white/40 cursor-pointer transition-all duration-300 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          {status === "idle" && <Upload size={18} className="text-stone-500" />}
          {status === "uploading" && <Loader2 size={18} className="text-amber-500 animate-spin" />}
          {status === "success" && <CheckCircle size={18} className="text-green-500" />}
          {status === "error" && <AlertCircle size={18} className="text-red-500" />}
          
          <div className="text-left">
            <p className="text-xs font-bold text-stone-700 uppercase tracking-wider">{label}</p>
            <p className="text-[10px] text-stone-500 truncate max-w-[200px] md:max-w-[300px]">
              {status === "idle" && "Drag here or click to browse files"}
              {status === "uploading" && `Uploading: ${progress}%`}
              {status === "success" && `Uploaded: ${fileName}`}
              {status === "error" && "Upload failed. Try again"}
            </p>
          </div>
        </div>

        {progress !== null && (
          <div className="w-24 bg-stone-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-amber-500 h-1.5 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

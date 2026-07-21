import { useState, useEffect, useRef } from "react";
import { FileText, ShoppingBag, MessageCircle, Settings, Plus, Pencil, Trash2, Save, LogIn, LogOut, Link as LinkIcon, Send, Image, Video, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { useCV } from "@/contexts/CVContext";
import { useAuth } from "@/contexts/AuthContext";
import { useShop, Product } from "@/contexts/ShopContext";
import { FileUploader } from "@/components/FileUploader";
import gsap from "gsap";

type Tab = "cv" | "social" | "products" | "messages" | "media" | "settings";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "cv", label: "CV Info", icon: FileText },
  { key: "social", label: "Social Links", icon: LinkIcon },
  { key: "products", label: "Products", icon: ShoppingBag },
  { key: "messages", label: "Messages", icon: MessageCircle },
  { key: "media", label: "Media & Links", icon: Award },
  { key: "settings", label: "Settings", icon: Settings },
];

const Admin = () => {
  const { user, loading, isAdmin, login, loginWithGoogle, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("cv");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPass);
      toast.success("Logged in successfully!");
    } catch (e: any) {
      toast.error(e.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Logged in with Google!");
    } catch (e: any) {
      toast.error(e.message || "Google login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      if (cursorGlowRef.current) {
        gsap.to(cursorGlowRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.6,
          ease: "power2.out",
        });
      }
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-stone-800 overflow-x-hidden relative selection:bg-amber-500/20 selection:text-amber-700">
      <Navbar />

      {/* Sunlit Amber Cursor Glow Follower */}
      <div 
        ref={cursorGlowRef} 
        className="fixed w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,rgba(245,158,11,0.04)_50%,transparent_100%)] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10 mix-blend-multiply no-print"
      />

      <div className="relative z-20 pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {!user || !isAdmin ? (
          <div className="max-w-md mx-auto py-16 animate-fade-in">
            <div className="glass-card rounded-2xl border border-white/50 p-8 space-y-6 hover:shadow-amber-500/5 transition-all duration-500">
              <div className="text-center">
                <LogIn size={40} className="mx-auto text-amber-500 mb-4" />
                <h1 className="text-3xl font-heading font-black text-stone-900">Admin Login</h1>
                <p className="text-sm text-stone-600 mt-2">Sign in to manage your CV and content</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Email</label>
                  <input 
                    type="email"
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)} 
                    placeholder="admin@email.com" 
                    className="w-full bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-800 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Password</label>
                  <input 
                    type="password" 
                    value={loginPass} 
                    onChange={(e) => setLoginPass(e.target.value)} 
                    placeholder="••••••••"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()} 
                    className="w-full bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-800 transition-all duration-300"
                  />
                </div>
                <button className="glass-btn-3d w-full py-4 text-xs font-bold uppercase tracking-wider gap-2 flex items-center justify-center shadow-md" onClick={handleLogin} disabled={loginLoading}>
                  <LogIn size={15} className="text-amber-600" /> {loginLoading ? "Signing in..." : "Sign In"}
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-200" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-[#FAF8F5] px-3.5 py-0.5 rounded-full border border-white/80 text-stone-400">or</span></div>
                </div>
                <button className="glass-btn-3d w-full py-4 text-xs font-bold uppercase tracking-wider gap-2 flex items-center justify-center shadow-md" onClick={handleGoogleLogin} disabled={loginLoading}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Sign in with Google
                </button>
                {user && !isAdmin && (
                  <p className="text-xs font-bold text-center text-red-500 uppercase tracking-wider">You are logged in but not authorized as admin.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl md:text-4xl font-heading font-black text-gradient tracking-tight">Admin Panel</h1>
              <button className="glass-btn-3d px-5 py-2.5 text-xs font-bold uppercase tracking-wider gap-2 flex items-center shadow-md" onClick={() => { logout(); toast.success("Logged out"); }}>
                <LogOut size={14} className="text-amber-600" /> Logout
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Tab Sidebar */}
              <div className="md:w-56 flex-shrink-0">
                <div className="glass-card rounded-2xl border border-white/50 p-3 space-y-1.5 hover:shadow-amber-500/5">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button 
                        key={tab.key} 
                        onClick={() => setActiveTab(tab.key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all duration-300 ${
                          isActive 
                            ? "bg-white/70 text-amber-650 border border-amber-500/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
                            : "text-stone-600 hover:text-stone-900 hover:bg-white/45 border border-transparent"
                        }`}
                      >
                        <tab.icon size={16} />
                        <span className="text-xs tracking-wider">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Panel Area */}
              <div className="flex-1 glass-card rounded-2xl border border-white/50 p-8 hover:shadow-amber-500/5">
                {activeTab === "cv" && <CVPanel />}
                {activeTab === "social" && <SocialPanel />}
                {activeTab === "products" && <ProductsPanel />}
                {activeTab === "messages" && <MessagesPanel />}
                {activeTab === "media" && <MediaPanel />}
                {activeTab === "settings" && <SettingsPanel />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CVPanel = () => {
  const { cv, updateCV, saveToFirestore } = useCV();
  const [name, setName] = useState(cv.name);
  const [title, setTitle] = useState(cv.title);
  const [about, setAbout] = useState(cv.about);
  const [phone, setPhone] = useState(cv.phone);
  const [email, setEmail] = useState(cv.email);
  const [address, setAddress] = useState(cv.address);
  const [location, setLocation] = useState(cv.location);
  const [dob, setDob] = useState(cv.dob);
  const [education, setEducation] = useState(cv.education);
  const [experience, setExperience] = useState(cv.experience);
  const [technicalSkills, setTechnicalSkills] = useState(cv.technicalSkills);
  const [creativeSkills, setCreativeSkills] = useState(cv.creativeSkills);
  const [languages, setLanguages] = useState(cv.languages);

  const handleSave = async () => {
    updateCV({ name, title, about, phone, email, address, location, dob, education, experience, technicalSkills, creativeSkills, languages });
    try {
      await saveToFirestore();
      toast.success("CV saved to Firebase! Changes are live.");
    } catch {
      toast.success("CV updated locally.");
    }
  };

  const updateEdu = (i: number, field: string, val: string) => {
    const copy = [...education];
    (copy[i] as any)[field] = val;
    setEducation(copy);
  };
  const updateEduDetail = (i: number, di: number, val: string) => {
    const copy = [...education];
    copy[i].details[di] = val;
    setEducation(copy);
  };
  const addEduDetail = (i: number) => {
    const copy = [...education];
    copy[i].details.push("");
    setEducation(copy);
  };
  const removeEduDetail = (i: number, di: number) => {
    const copy = [...education];
    copy[i].details.splice(di, 1);
    setEducation(copy);
  };
  const addEducation = () => setEducation([...education, { period: "", degree: "", school: "", details: [] }]);
  const removeEducation = (i: number) => setEducation(education.filter((_, idx) => idx !== i));

  const updateExp = (i: number, field: string, val: string) => {
    const copy = [...experience];
    (copy[i] as any)[field] = val;
    setExperience(copy);
  };
  const addExperience = () => setExperience([...experience, { year: "", title: "", desc: "" }]);
  const removeExperience = (i: number) => setExperience(experience.filter((_, idx) => idx !== i));

  const updateSkill = (arr: { name: string; pct: number }[], setter: Function, i: number, field: string, val: string | number) => {
    const copy = [...arr];
    (copy[i] as any)[field] = val;
    setter(copy);
  };
  const addSkill = (arr: { name: string; pct: number }[], setter: Function) => setter([...arr, { name: "", pct: 50 }]);
  const removeSkill = (arr: { name: string; pct: number }[], setter: Function, i: number) => setter(arr.filter((_, idx) => idx !== i));

  const updateLang = (i: number, field: string, val: string | number) => {
    const copy = [...languages];
    (copy[i] as any)[field] = val;
    setLanguages(copy);
  };
  const addLanguage = () => setLanguages([...languages, { name: "", pct: 50, level: "" }]);
  const removeLanguage = (i: number) => setLanguages(languages.filter((_, idx) => idx !== i));

  const glassInputClass = "w-full bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-800 transition-all duration-300";
  const glassTextareaClass = "w-full bg-white/40 border border-white/60 rounded-2xl p-5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-800 transition-all duration-300";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-2xl font-heading font-black text-stone-900">Edit CV Information</h2>
          <p className="text-xs text-stone-500 mt-1 uppercase font-bold tracking-widest">Changes save to Firebase instantly</p>
        </div>
        <button className="glass-btn-3d px-6 py-3 font-bold gap-2 flex items-center shadow-md" onClick={handleSave}><Save size={15} className="text-amber-600" /> Save All</button>
      </div>

      {/* Basic Info */}
      <div className="space-y-5">
        <h3 className="text-lg font-bold text-amber-600 border-b border-stone-200 pb-2 uppercase tracking-wider text-xs">Personal Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Full Name</label><input className={glassInputClass} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Title</label><input className={glassInputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Phone</label><input className={glassInputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Email</label><input className={glassInputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Location</label><input className={glassInputClass} value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Address</label><input className={glassInputClass} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Date of Birth</label><input className={glassInputClass} value={dob} onChange={(e) => setDob(e.target.value)} /></div>
        </div>
        <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">About Me</label><textarea className={glassTextareaClass} value={about} onChange={(e) => setAbout(e.target.value)} rows={4} /></div>
      </div>

      {/* Education */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">Education</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={addEducation}><Plus size={13} className="text-amber-600" /> Add</button>
        </div>
        {education.map((edu, i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/50 bg-white/20 space-y-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                <input className={glassInputClass} placeholder="Period (e.g. 2018-2022)" value={edu.period} onChange={e => updateEdu(i, "period", e.target.value)} />
                <input className={glassInputClass} placeholder="Degree" value={edu.degree} onChange={e => updateEdu(i, "degree", e.target.value)} />
                <input className={glassInputClass} placeholder="School" value={edu.school} onChange={e => updateEdu(i, "school", e.target.value)} />
              </div>
              <button className="p-2 text-red-500 hover:text-red-650 hover:bg-red-500/10 rounded-full transition-colors ml-2 mt-1" onClick={() => removeEducation(i)}><Trash2 size={15} /></button>
            </div>
            <div className="space-y-2 pl-4">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1 block">Details</label>
              {edu.details.map((d, di) => (
                <div key={di} className="flex gap-2">
                  <input className={glassInputClass} value={d} onChange={e => updateEduDetail(i, di, e.target.value)} />
                  <button className="p-2 text-red-500 hover:text-red-650 hover:bg-red-500/10 rounded-full transition-colors" onClick={() => removeEduDetail(i, di)}><Trash2 size={13} /></button>
                </div>
              ))}
              <button className="text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-500 gap-1 flex items-center transition-colors pt-1" onClick={() => addEduDetail(i)}><Plus size={12} /> Add detail</button>
            </div>
          </div>
        ))}
      </div>

      {/* Experience */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">Experience</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={addExperience}><Plus size={13} className="text-amber-600" /> Add</button>
        </div>
        {experience.map((exp, i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/50 bg-white/20 shadow-sm">
            <div className="flex gap-3 items-start">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                <input className={glassInputClass} placeholder="Year" value={exp.year} onChange={e => updateExp(i, "year", e.target.value)} />
                <input className={glassInputClass} placeholder="Title" value={exp.title} onChange={e => updateExp(i, "title", e.target.value)} />
                <input className={glassInputClass} placeholder="Description" value={exp.desc} onChange={e => updateExp(i, "desc", e.target.value)} />
              </div>
              <button className="p-2 text-red-500 hover:text-red-655 hover:bg-red-500/10 rounded-full transition-colors mt-1" onClick={() => removeExperience(i)}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Technical Skills */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">Technical Skills</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={() => addSkill(technicalSkills, setTechnicalSkills)}><Plus size={13} className="text-amber-600" /> Add</button>
        </div>
        {technicalSkills.map((s, i) => (
          <div key={i} className="flex items-center gap-4">
            <input className={`${glassInputClass} flex-1`} placeholder="Skill name" value={s.name} onChange={e => updateSkill(technicalSkills, setTechnicalSkills, i, "name", e.target.value)} />
            <div className="flex items-center gap-3 w-44">
              <input type="range" min={0} max={100} value={s.pct} onChange={e => updateSkill(technicalSkills, setTechnicalSkills, i, "pct", parseInt(e.target.value))} className="flex-1 accent-amber-500" />
              <span className="text-xs font-bold text-amber-600 w-10">{s.pct}%</span>
            </div>
            <button className="p-2 text-red-500 hover:text-red-655 hover:bg-red-500/10 rounded-full transition-colors" onClick={() => removeSkill(technicalSkills, setTechnicalSkills, i)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {/* Creative Skills */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">Creative Skills</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={() => addSkill(creativeSkills, setCreativeSkills)}><Plus size={13} className="text-amber-600" /> Add</button>
        </div>
        {creativeSkills.map((s, i) => (
          <div key={i} className="flex items-center gap-4">
            <input className={`${glassInputClass} flex-1`} placeholder="Skill name" value={s.name} onChange={e => updateSkill(creativeSkills, setCreativeSkills, i, "name", e.target.value)} />
            <div className="flex items-center gap-3 w-44">
              <input type="range" min={0} max={100} value={s.pct} onChange={e => updateSkill(creativeSkills, setCreativeSkills, i, "pct", parseInt(e.target.value))} className="flex-1 accent-orange-500" />
              <span className="text-xs font-bold text-orange-650 w-10">{s.pct}%</span>
            </div>
            <button className="p-2 text-red-500 hover:text-red-655 hover:bg-red-500/10 rounded-full transition-colors" onClick={() => removeSkill(creativeSkills, setCreativeSkills, i)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {/* Languages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">Languages</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={addLanguage}><Plus size={13} className="text-amber-600" /> Add</button>
        </div>
        {languages.map((l, i) => (
          <div key={i} className="flex items-center gap-4">
            <input className={`${glassInputClass} flex-1`} placeholder="Language" value={l.name} onChange={e => updateLang(i, "name", e.target.value)} />
            <input className={`${glassInputClass} w-32`} placeholder="Level" value={l.level} onChange={e => updateLang(i, "level", e.target.value)} />
            <div className="flex items-center gap-3 w-44">
              <input type="range" min={0} max={100} value={l.pct} onChange={e => updateLang(i, "pct", parseInt(e.target.value))} className="flex-1 accent-amber-500" />
              <span className="text-xs font-bold text-amber-600 w-10">{l.pct}%</span>
            </div>
            <button className="p-2 text-red-500 hover:text-red-655 hover:bg-red-500/10 rounded-full transition-colors" onClick={() => removeLanguage(i)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      <button className="glass-btn-3d w-full py-4 text-xs font-bold uppercase tracking-widest gap-2 flex items-center justify-center shadow-md" onClick={handleSave}><Save size={15} className="text-amber-600" /> Save All Changes to Firebase</button>
    </div>
  );
};

const SocialPanel = () => {
  const { cv, updateCV, saveToFirestore } = useCV();
  const [github, setGithub] = useState(cv.socialLinks?.github || "");
  const [linkedin, setLinkedin] = useState(cv.socialLinks?.linkedin || "");
  const [instagram, setInstagram] = useState(cv.socialLinks?.instagram || "");
  const [whatsapp, setWhatsapp] = useState(cv.socialLinks?.whatsapp || "");
  const [tiktok, setTiktok] = useState(cv.socialLinks?.tiktok || "");

  const handleSave = async () => {
    updateCV({ socialLinks: { github, linkedin, instagram, whatsapp, tiktok } });
    try {
      await saveToFirestore();
      toast.success("Social links saved!");
    } catch {
      toast.success("Social links updated locally.");
    }
  };

  const glassInputClass = "w-full bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-850 transition-all duration-300";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-heading font-black text-stone-900 border-b border-stone-200 pb-4">Social Links</h2>
      <p className="text-sm text-stone-605">Add your social media URLs. They will appear on your CV page.</p>
      <div className="space-y-4">
        <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">GitHub URL</label><input className={glassInputClass} value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/username" /></div>
        <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">LinkedIn URL</label><input className={glassInputClass} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/username" /></div>
        <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Instagram URL</label><input className={glassInputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/username" /></div>
        <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">WhatsApp Link</label><input className={glassInputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="https://wa.me/351927717490" /></div>
        <div><label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">TikTok URL</label><input className={glassInputClass} value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@username" /></div>
      </div>
      <button className="glass-btn-3d px-6 py-3 font-bold gap-2 flex items-center shadow-md" onClick={handleSave}><Save size={15} className="text-amber-600" /> Save Social Links</button>
    </div>
  );
};

const ProductsPanel = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, deleteCategory } = useShop();
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newCatKey, setNewCatKey] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});

  const handleAdd = async () => {
    if (!newTitle || !newPrice) return toast.error("Title and price required");
    await addProduct({
      title: newTitle,
      description: newDesc,
      price: parseFloat(newPrice),
      category: newCat || "courses",
      image: newImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop",
    });
    setNewTitle(""); setNewDesc(""); setNewPrice(""); setNewCat(""); setNewImage("");
    setShowAdd(false);
    toast.success("Product added!");
  };

  const handleAddCat = async () => {
    if (!newCatKey || !newCatLabel) return toast.error("Key and label required");
    await addCategory(newCatKey.toLowerCase().replace(/\s+/g, "-"), newCatLabel);
    setNewCatKey(""); setNewCatLabel("");
    setShowAddCat(false);
    toast.success("Category added!");
  };

  const handleSaveEdit = async (id: string) => {
    await updateProduct(id, editData);
    setEditId(null);
    setEditData({});
    toast.success("Product updated!");
  };

  const glassInputClass = "w-full bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-850 transition-all duration-300";
  const glassTextareaClass = "w-full bg-white/40 border border-white/60 rounded-2xl p-5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-850 transition-all duration-300";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-stone-200 pb-4">
        <h2 className="text-2xl font-heading font-black text-stone-900">Manage Products</h2>
        <div className="flex gap-2">
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center shadow-md" onClick={() => setShowAddCat(!showAddCat)}>
            <Plus size={15} className="text-amber-600" /> Category
          </button>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center shadow-md" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={15} className="text-amber-600" /> Product
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2.5">
        {categories.map(c => (
          <span key={c.id} className="text-[10px] uppercase font-bold tracking-widest text-amber-700 bg-amber-500/10 px-3 py-1 border border-amber-500/20 rounded-full flex items-center gap-1.5 shadow-sm">
            {c.label}
            <button onClick={() => { deleteCategory(c.id); toast.success("Category removed"); }} className="ml-1 text-red-500 hover:text-red-650 font-black text-xs">×</button>
          </span>
        ))}
      </div>

      {/* Add Category Form */}
      {showAddCat && (
        <div className="p-5 rounded-2xl border border-white/50 bg-white/20 space-y-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <input className={glassInputClass} placeholder="Key (e.g. strategy-trading)" value={newCatKey} onChange={e => setNewCatKey(e.target.value)} />
            <input className={glassInputClass} placeholder="Label (e.g. Strategy Trading)" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} />
          </div>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm" onClick={handleAddCat}>Add Category</button>
        </div>
      )}

      {/* Add Product Form */}
      {showAdd && (
        <div className="p-5 rounded-2xl border border-white/50 bg-white/20 space-y-4 shadow-sm">
          <input className={glassInputClass} placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <textarea className={glassTextareaClass} placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <input className={glassInputClass} placeholder="Price" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
            <select className="bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 text-stone-850" value={newCat} onChange={e => setNewCat(e.target.value)}>
              <option value="" className="bg-[#FAF8F5] text-stone-800">Select category</option>
              {categories.map(c => <option key={c.id} value={c.key} className="bg-[#FAF8F5] text-stone-800">{c.label}</option>)}
            </select>
          </div>
          <input className={glassInputClass} placeholder="Image URL" value={newImage} onChange={e => setNewImage(e.target.value)} />
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm" onClick={handleAdd}>Add Product</button>
        </div>
      )}

      {/* Product List */}
      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="p-4 rounded-xl border border-white/50 bg-white/20 hover:bg-white/40 transition-colors shadow-sm">
            {editId === p.id ? (
              <div className="space-y-3">
                <input className={glassInputClass} value={editData.title ?? p.title} onChange={e => setEditData({ ...editData, title: e.target.value })} />
                <input className={glassInputClass} value={editData.description ?? p.description} onChange={e => setEditData({ ...editData, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={glassInputClass} type="number" value={editData.price ?? p.price} onChange={e => setEditData({ ...editData, price: parseFloat(e.target.value) })} />
                  <select className="bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 text-stone-850" value={editData.category ?? p.category} onChange={e => setEditData({ ...editData, category: e.target.value })}>
                    {categories.map(c => <option key={c.id} value={c.key} className="bg-[#FAF8F5] text-stone-800">{c.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm" onClick={() => handleSaveEdit(p.id)}><Save size={13} className="text-amber-600" /> Save</button>
                  <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm" onClick={() => setEditId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-amber-700 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded-sm">{p.category}</span>
                  <span className="font-semibold text-stone-900 text-sm">{p.title}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-amber-600">${p.price}</span>
                  <button className="p-2 text-amber-600 hover:text-amber-500 hover:bg-white/40 rounded-full transition-all duration-300" onClick={() => { setEditId(p.id); setEditData({}); }}><Pencil size={15} /></button>
                  <button className="p-2 text-red-500 hover:text-red-655 hover:bg-red-500/10 rounded-full transition-all duration-300" onClick={() => { deleteProduct(p.id); toast.success("Product removed!"); }}><Trash2 size={15} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const MessagesPanel = () => {
  const [chats, setChats] = useState<{ id: string; lastMessage: string; lastMessageAt: any; unread: boolean }[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; text: string; sender: string; createdAt: any }[]>([]);
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadChats = async () => {
      const { collection: col, query: q, orderBy: ob, onSnapshot: snap } = await import("firebase/firestore");
      const { db: fireDb } = await import("@/lib/firebase");
      const chatsQuery = q(col(fireDb, "chats"), ob("lastMessageAt", "desc"));
      return snap(chatsQuery, (snapshot) => {
        setChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      });
    };
    const unsub = loadChats();
    return () => { unsub.then(u => u()); };
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    const loadMessages = async () => {
      const { collection: col, query: q, orderBy: ob, onSnapshot: snap } = await import("firebase/firestore");
      const { db: fireDb } = await import("@/lib/firebase");
      const msgsQuery = q(col(fireDb, "chats", selectedChat, "messages"), ob("createdAt", "asc"));
      return snap(msgsQuery, (snapshot) => {
        setChatMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      });
    };
    const unsub = loadMessages();
    return () => { unsub.then(u => u()); };
  }, [selectedChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedChat) return;
    const { addDoc, collection: col, serverTimestamp, doc: docRef, updateDoc } = await import("firebase/firestore");
    const { db: fireDb } = await import("@/lib/firebase");
    await addDoc(col(fireDb, "chats", selectedChat, "messages"), {
      text: reply.trim(),
      sender: "admin",
      visitorId: selectedChat,
      createdAt: serverTimestamp(),
    });
    await updateDoc(docRef(fireDb, "chats", selectedChat), {
      lastMessage: reply.trim(),
      lastMessageAt: serverTimestamp(),
      unread: false,
    });
    setReply("");
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const glassInputClass = "w-full bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-850 transition-all duration-300";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-heading font-black text-stone-900 border-b border-stone-200 pb-4">Messages (Real-time)</h2>

      {!selectedChat ? (
        <div className="space-y-3">
          {chats.length === 0 && <p className="text-sm text-stone-500">No messages yet. Visitors can send messages from the Chat page.</p>}
          {chats.map((chat) => (
            <button key={chat.id} onClick={() => setSelectedChat(chat.id)}
              className="w-full p-4 rounded-xl border border-white/50 bg-white/20 hover:bg-white/40 text-left transition-all duration-300 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-stone-900 text-sm flex items-center gap-2">
                  {chat.id.substring(0, 20)}...
                  {chat.unread && <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
                </span>
                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">{formatTime(chat.lastMessageAt)}</span>
              </div>
              <p className="text-sm text-stone-600 truncate">{chat.lastMessage}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="hover:bg-white/40 rounded-full text-xs font-bold uppercase tracking-wider px-4 text-stone-700" onClick={() => setSelectedChat(null)}>← Back to conversations</Button>
          <div className="h-80 overflow-y-auto space-y-3 border border-stone-200 rounded-2xl p-4 bg-white/20 shadow-inner">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === "admin" 
                    ? "bg-amber-500/25 text-amber-900 rounded-br-none shadow-sm border border-amber-500/20" 
                    : "bg-white/60 text-stone-850 border border-white/80 rounded-bl-none shadow-sm"
                }`}>
                  <p>{msg.text}</p>
                  <p className="text-[9px] opacity-75 uppercase tracking-widest font-bold mt-1 text-right">{formatTime(msg.createdAt)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..."
              onKeyDown={e => e.key === "Enter" && sendReply()} className={`${glassInputClass} flex-1`} />
            <button className="glass-btn-3d w-11 h-11 flex items-center justify-center rounded-full disabled:opacity-40" onClick={sendReply} disabled={!reply.trim()}><Send size={15} className="text-amber-600" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsPanel = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-heading font-black text-stone-900 border-b border-stone-200 pb-4">Settings</h2>
    <div className="bg-white/20 rounded-2xl p-6 border border-white/50 shadow-sm">
      <h3 className="font-bold text-gradient text-lg mb-1.5">🔥 Firebase Connected</h3>
      <p className="text-sm text-stone-605">
        Project: cv-davood-54a28 • Auth & Firestore active
      </p>
    </div>
    <div className="bg-white/20 rounded-2xl p-6 border border-white/50 shadow-sm">
      <h3 className="font-bold text-gradient text-lg mb-1.5">🔒 Security</h3>
      <p className="text-sm text-stone-605 leading-relaxed">
        Admin access is hidden — only accessible via 5 taps on the profile photo. 
        Firestore rules restrict writes to verified admins only.
      </p>
    </div>
  </div>
);

const MediaPanel = () => {
  const { cv, updateCV, saveToFirestore } = useCV();
  const [customLinks, setCustomLinks] = useState(cv.customLinks || []);
  const [certificates, setCertificates] = useState(cv.certificates || []);
  const [gallery, setGallery] = useState(cv.gallery || []);
  const [videos, setVideos] = useState(cv.videos || []);

  const handleSave = async () => {
    updateCV({ customLinks, certificates, gallery, videos });
    try {
      await saveToFirestore();
      toast.success("Media & Links saved successfully!");
    } catch {
      toast.success("Media & Links updated locally.");
    }
  };

  const glassInputClass = "w-full bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-800 transition-all duration-300";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-2xl font-heading font-black text-stone-900">Manage Media & Extra Links</h2>
          <p className="text-xs text-stone-500 mt-1 uppercase font-bold tracking-widest">Add course certificates, images, videos, and custom URLs</p>
        </div>
        <button className="glass-btn-3d px-6 py-3 font-bold gap-2 flex items-center shadow-md" onClick={handleSave}><Save size={15} className="text-amber-600" /> Save Media</button>
      </div>

      {/* Custom Links */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">Custom Links</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={() => setCustomLinks([...customLinks, { label: "", url: "" }])}><Plus size={13} className="text-amber-600" /> Add Link</button>
        </div>
        {customLinks.map((lnk, i) => (
          <div key={i} className="flex gap-4 items-center">
            <input className={glassInputClass} placeholder="Link Label (e.g. My Portfolio)" value={lnk.label} onChange={e => {
              const copy = [...customLinks];
              copy[i].label = e.target.value;
              setCustomLinks(copy);
            }} />
            <input className={glassInputClass} placeholder="URL (https://...)" value={lnk.url} onChange={e => {
              const copy = [...customLinks];
              copy[i].url = e.target.value;
              setCustomLinks(copy);
            }} />
            <button className="p-2 text-red-500 hover:text-red-650 hover:bg-red-500/10 rounded-full transition-colors" onClick={() => setCustomLinks(customLinks.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {/* Certificates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">Certificates & Courses</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={() => setCertificates([...certificates, { title: "", school: "", date: "", fileUrl: "", imgUrl: "" }])}><Plus size={13} className="text-amber-600" /> Add Certificate</button>
        </div>
        {certificates.map((cert, i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/50 bg-white/20 space-y-4 shadow-sm relative">
            <button className="absolute right-4 top-4 p-2 text-red-500 hover:text-red-650 hover:bg-red-500/10 rounded-full transition-colors" onClick={() => setCertificates(certificates.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Certificate Title</label>
                <input className={glassInputClass} placeholder="e.g. Google Cloud Architecture" value={cert.title} onChange={e => {
                  const copy = [...certificates];
                  copy[i].title = e.target.value;
                  setCertificates(copy);
                }} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">School/Issuer</label>
                <input className={glassInputClass} placeholder="e.g. Braga Professional School" value={cert.school} onChange={e => {
                  const copy = [...certificates];
                  copy[i].school = e.target.value;
                  setCertificates(copy);
                }} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Date</label>
                <input className={glassInputClass} placeholder="e.g. June 2026" value={cert.date} onChange={e => {
                  const copy = [...certificates];
                  copy[i].date = e.target.value;
                  setCertificates(copy);
                }} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Certificate File URL (PDF)</label>
                <input className={glassInputClass} placeholder="https://... (or local path)" value={cert.fileUrl} onChange={e => {
                  const copy = [...certificates];
                  copy[i].fileUrl = e.target.value;
                  setCertificates(copy);
                }} />
                <div className="mt-2">
                  <FileUploader 
                    label="Upload Certificate PDF / Document" 
                    allowedTypes="application/pdf,.doc,.docx"
                    folder="certificates"
                    onUploadSuccess={(url) => {
                      const copy = [...certificates];
                      copy[i].fileUrl = url;
                      setCertificates(copy);
                    }}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Credential Image URL</label>
                <input className={glassInputClass} placeholder="https://... (or local path)" value={cert.imgUrl} onChange={e => {
                  const copy = [...certificates];
                  copy[i].imgUrl = e.target.value;
                  setCertificates(copy);
                }} />
                <div className="mt-2">
                  <FileUploader 
                    label="Upload Credential Image" 
                    allowedTypes="image/*"
                    folder="certificates/images"
                    onUploadSuccess={(url) => {
                      const copy = [...certificates];
                      copy[i].imgUrl = url;
                      setCertificates(copy);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gallery / Images */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">My Gallery / Images</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={() => setGallery([...gallery, { title: "", imgUrl: "" }])}><Plus size={13} className="text-amber-600" /> Add Image</button>
        </div>
        {gallery.map((img, i) => (
          <div key={i} className="p-4 rounded-2xl border border-white/50 bg-white/20 space-y-3 relative">
            <button className="absolute right-4 top-4 p-2 text-red-500 hover:text-red-650 hover:bg-red-500/10 rounded-full transition-colors" onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Image Title</label>
                <input className={glassInputClass} placeholder="Image Title" value={img.title} onChange={e => {
                  const copy = [...gallery];
                  copy[i].title = e.target.value;
                  setGallery(copy);
                }} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Image URL / Upload</label>
                <input className={glassInputClass} placeholder="Image URL (https://... or local)" value={img.imgUrl} onChange={e => {
                  const copy = [...gallery];
                  copy[i].imgUrl = e.target.value;
                  setGallery(copy);
                }} />
                <div className="mt-2">
                  <FileUploader 
                    label="Upload Gallery Image" 
                    allowedTypes="image/*"
                    folder="gallery"
                    onUploadSuccess={(url) => {
                      const copy = [...gallery];
                      copy[i].imgUrl = url;
                      setGallery(copy);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Videos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h3 className="text-lg font-bold text-amber-600 uppercase tracking-wider text-xs">My Videos</h3>
          <button className="glass-btn-3d px-4 py-2 text-xs font-bold uppercase tracking-wider gap-1.5 flex items-center" onClick={() => setVideos([...videos, { title: "", videoUrl: "" }])}><Plus size={13} className="text-amber-600" /> Add Video</button>
        </div>
        {videos.map((vid, i) => (
          <div key={i} className="p-4 rounded-2xl border border-white/50 bg-white/20 space-y-3 relative">
            <button className="absolute right-4 top-4 p-2 text-red-500 hover:text-red-650 hover:bg-red-500/10 rounded-full transition-colors" onClick={() => setVideos(videos.filter((_, idx) => idx !== i))}><Trash2 size={15} /></button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Video Title</label>
                <input className={glassInputClass} placeholder="Video Title" value={vid.title} onChange={e => {
                  const copy = [...videos];
                  copy[i].title = e.target.value;
                  setVideos(copy);
                }} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">Video URL (YouTube/MP4) / Upload</label>
                <input className={glassInputClass} placeholder="Video URL (MP4, Youtube, etc.)" value={vid.videoUrl} onChange={e => {
                  const copy = [...videos];
                  copy[i].videoUrl = e.target.value;
                  setVideos(copy);
                }} />
                <div className="mt-2">
                  <FileUploader 
                    label="Upload Video File (MP4)" 
                    allowedTypes="video/mp4"
                    folder="videos"
                    onUploadSuccess={(url) => {
                      const copy = [...videos];
                      copy[i].videoUrl = url;
                      setVideos(copy);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;

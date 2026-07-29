import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, Globe, CheckCircle, Github, Linkedin, Instagram, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import profileImg from "@/assets/profile.jpg";
import euFlag from "@/assets/eu-flag.png";
import jsPDF from "jspdf";
import { useCV } from "@/contexts/CVContext";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

gsap.registerPlugin(ScrollTrigger);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/>
  </svg>
);

const Index = () => {
  const cvRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const { cv } = useCV();
  const navigate = useNavigate();

  // Secret admin access: tap profile 5 times
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleProfileTap = useCallback(() => {
    setTapCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        window.sessionStorage.setItem("secret_admin_unlocked", "true");
        navigate("/dashboard-interno");
        return 0;
      }
      return next;
    });
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => setTapCount(0), 2000);
  }, [navigate]);

  // 3D Card Hover Tilt calculation
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((centerY - y) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * 8;
    
    gsap.to(card, {
      rotateX: rotateX,
      rotateY: rotateY,
      transformPerspective: 1000,
      borderColor: "rgba(212, 175, 55, 0.4)",
      boxShadow: `${-rotateY * 1}px ${rotateX * 1}px 35px rgba(212, 175, 55, 0.1)`,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      borderColor: "rgba(255, 255, 255, 0.5)",
      boxShadow: "0 8px 32px 0 rgba(139, 90, 43, 0.08)",
      duration: 0.5,
      ease: "power2.out"
    });
  };

  useEffect(() => {
    // 1. Mouse follower cursor glow (warm sunlit amber light follower)
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

    // 2. Hero Text Scroll Animation
    if (heroRef.current && textRef.current) {
      gsap.to(textRef.current, {
        y: -100,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        }
      });
    }

    // 3. Stagger reveal for all sections
    const cards = gsap.utils.toArray(".reveal-section");
    cards.forEach((card: any) => {
      gsap.fromTo(card,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            toggleActions: "play none none none",
          }
        }
      );
    });

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  const socialLinks = [
    { key: "github", icon: Github, url: cv.socialLinks?.github, label: "GitHub" },
    { key: "linkedin", icon: Linkedin, url: cv.socialLinks?.linkedin, label: "LinkedIn" },
    { key: "instagram", icon: Instagram, url: cv.socialLinks?.instagram, label: "Instagram" },
    { key: "whatsapp", icon: MessageCircle, url: cv.socialLinks?.whatsapp, label: "WhatsApp" },
    { key: "tiktok", icon: TikTokIcon, url: cv.socialLinks?.tiktok, label: "TikTok" },
  ].filter(l => l.url);

  const handleDownloadPDF = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const checkPage = (needed: number) => {
      if (y + needed > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    pdf.setFillColor(212, 175, 55); // Gold Header for PDF export
    pdf.rect(0, 0, pageW, 52, "F");

    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text("★ Europass", margin, 10);

    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(cv.name, margin, 25);

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(255, 248, 238);
    pdf.text(cv.title, margin, 33);

    pdf.setFontSize(8);
    pdf.setTextColor(255, 248, 238);
    const contactLine = `${cv.location}  |  ${cv.phone}  |  ${cv.email}`;
    pdf.text(contactLine, margin, 41);

    const socials: string[] = [];
    if (cv.socialLinks?.github) socials.push(`GitHub: ${cv.socialLinks.github}`);
    if (cv.socialLinks?.linkedin) socials.push(`LinkedIn: ${cv.socialLinks.linkedin}`);
    if (cv.socialLinks?.whatsapp) socials.push(`WhatsApp: ${cv.socialLinks.whatsapp}`);
    if (socials.length > 0) {
      pdf.setFontSize(7);
      pdf.text(socials.join("  |  "), margin, 48);
    }

    y = 60;

    const sectionTitle = (title: string) => {
      checkPage(12);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(212, 175, 55);
      pdf.text(title, margin, y);
      y += 2;
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 6;
    };

    const addText = (text: string, fontSize: number, color: [number, number, number], bold = false, indent = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, contentW - indent);
      checkPage(lines.length * (fontSize * 0.4 + 1));
      pdf.text(lines, margin + indent, y);
      y += lines.length * (fontSize * 0.4 + 1);
    };

    sectionTitle("About Me");
    addText(cv.about, 9, [60, 60, 80]);
    y += 4;

    sectionTitle("Education");
    cv.education.forEach((edu) => {
      checkPage(20);
      addText(edu.period, 8, [120, 120, 140]);
      addText(edu.degree, 10, [30, 30, 50], true);
      addText(edu.school, 9, [212, 175, 55]);
      edu.details.forEach((d) => {
        addText(`• ${d}`, 8, [80, 80, 100], false, 4);
      });
      y += 3;
    });

    sectionTitle("Work Experience");
    cv.experience.forEach((exp) => {
      checkPage(15);
      addText(exp.year, 8, [120, 120, 140]);
      addText(exp.title, 10, [30, 30, 50], true);
      addText(exp.desc, 8, [80, 80, 100], false, 4);
      y += 3;
    });

    sectionTitle("Skills");

    const drawSkillBars = (title: string, skills: { name: string; pct: number }[], startX: number, barW: number) => {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 50);
      const savedY = y;
      pdf.text(title, startX, y);
      let localY = y + 5;

      skills.forEach((s) => {
        if (localY > pageH - margin - 10) return;
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 80);
        pdf.text(s.name, startX, localY);
        pdf.text(`${s.pct}%`, startX + barW - 2, localY, { align: "right" });
        localY += 3;
        pdf.setFillColor(230, 230, 240);
        pdf.roundedRect(startX, localY, barW, 2.5, 1, 1, "F");
        pdf.setFillColor(212, 175, 55);
        pdf.roundedRect(startX, localY, barW * (s.pct / 100), 2.5, 1, 1, "F");
        localY += 6;
      });
      return localY;
    };

    const colW = (contentW - 8) / 3;
    checkPage(50);
    const y1 = drawSkillBars("Technical", cv.technicalSkills, margin, colW);
    const y2 = drawSkillBars("Creative", cv.creativeSkills, margin + colW + 4, colW);
    const y3 = drawSkillBars("Languages", cv.languages.map(l => ({ name: `${l.name} (${l.level})`, pct: l.pct })), margin + (colW + 4) * 2, colW);
    y = Math.max(y1 || y, y2 || y, y3 || y) + 4;

    sectionTitle("Contact Information");
    checkPage(20);
    const contacts = [
      { label: "Phone", value: cv.phone },
      { label: "Email", value: cv.email },
      { label: "Address", value: cv.address },
      { label: "Date of Birth", value: cv.dob },
      { label: "Location", value: cv.location },
    ];
    contacts.forEach((c) => {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 50);
      pdf.text(`${c.label}:`, margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 60, 80);
      pdf.text(c.value, margin + 30, y);
      y += 5;
    });

    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 180);
    pdf.text(`Generated on ${new Date().toLocaleDateString("en-GB")} — Europass CV`, margin, pageH - 8);

    pdf.save("Davood_Sharifi_CV.pdf");
  };

  return (
    <div className="min-h-screen text-stone-850 overflow-x-hidden relative selection:bg-amber-500/20 selection:text-amber-700">
      <Navbar />

      {/* Sunlit Amber Cursor Glow Follower */}
      <div 
        ref={cursorGlowRef} 
        className="fixed w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,rgba(245,158,11,0.04)_50%,transparent_100%)] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10 mix-blend-multiply no-print"
      />

      <div id="cv-printable" className="relative z-20">
        {/* Hero Section */}
        <section 
          ref={heroRef}
          className="relative min-h-[90vh] flex items-center overflow-hidden pt-24 pb-16 md:pb-24 no-print bg-transparent"
        >
          <div ref={textRef} className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full animate-fade-in">
            <div className="glass-card p-8 md:p-12 rounded-[32px] border border-white/60 bg-white/94 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8 justify-center md:justify-start">
                <img src={euFlag} alt="European Union Flag" className="w-9 h-9 object-contain shadow-md rounded-sm" />
                <span className="text-amber-600 text-lg font-heading font-bold tracking-widest uppercase">Europass</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                <div 
                  className="relative w-44 h-44 md:w-56 md:h-56 flex-shrink-0 flex items-center justify-center cursor-pointer select-none"
                  onClick={handleProfileTap}
                >
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '24s' }}>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const angle = (i * 30) * (Math.PI / 180);
                      const radius = 48;
                      const x = 50 + radius * Math.cos(angle);
                      const y = 50 + radius * Math.sin(angle);
                      return (
                        <span key={i} className="absolute text-amber-500 text-[11px] drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                          ★
                        </span>
                      );
                    })}
                  </div>
                  <div className="w-36 h-36 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl z-10 hover:scale-105 transition-transform duration-500">
                    <img src={profileImg} alt={cv.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="text-center md:text-left flex-1">
                  <h1 className="text-5xl md:text-6xl font-heading font-black text-stone-900 mb-3 tracking-tight">
                    {cv.name}
                  </h1>
                  <p className="text-2xl md:text-3xl text-gradient font-bold mb-6">{cv.title}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-5 text-sm text-stone-700 font-medium mb-6">
                    <span className="flex items-center gap-1.5"><MapPin size={15} className="text-amber-500" /> {cv.location}</span>
                    <span className="flex items-center gap-1.5"><Phone size={15} className="text-amber-500" /> {cv.phone}</span>
                    <span className="flex items-center gap-1.5"><Mail size={15} className="text-amber-500" /> {cv.email}</span>
                  </div>
                  
                  {/* Social Links */}
                  {socialLinks.length > 0 && (
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                      {socialLinks.map((s) => (
                        <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/50 hover:bg-white/90 border border-white/80 hover:border-amber-500/30 text-stone-700 text-xs font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 hover:text-amber-600 shadow-md">
                          {s.key === "tiktok" ? <TikTokIcon /> : <s.icon size={13} />}
                          {s.label}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Custom Extra Links */}
                  {cv.customLinks && cv.customLinks.length > 0 && (
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                      {cv.customLinks.map((lnk, idx) => (
                        <a key={idx} href={lnk.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 hover:bg-white/95 border border-white/80 hover:border-amber-500/30 text-stone-700 text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:text-amber-600 shadow-md">
                          <Globe size={13} className="text-amber-500" />
                          {lnk.label}
                        </a>
                      ))}
                    </div>
                  )}
                  <button onClick={handleDownloadPDF}
                    className="glass-btn-3d mt-8 font-bold gap-2 flex items-center justify-center px-8 py-4 text-sm uppercase tracking-widest shadow-lg">
                    <Download size={15} className="text-amber-500" /> Download CV as PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CV Sections Content */}
        <div ref={cvRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 relative z-20">
          
          {/* About Me Wrapped in 3D ContainerScroll */}
          <div className="reveal-section w-full">
            <ContainerScroll
              titleComponent={
                <>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Premium Digital Space</span>
                  <h2 className="text-4xl font-heading font-black text-stone-900 mt-2 leading-tight">
                    Unveiling My Creative Space
                  </h2>
                </>
              }
            >
              <div className="p-8 md:p-12 bg-white/40 h-full flex flex-col justify-center">
                <h3 className="text-3xl font-extrabold text-stone-900 mb-6 border-l-4 border-amber-500 pl-4">About Me</h3>
                <p className="text-stone-700 text-lg leading-relaxed">{cv.about}</p>
              </div>
            </ContainerScroll>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Education */}
            <section 
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="glass-card reveal-section p-8 md:p-10 transition-all duration-300 border border-white/50"
            >
              <h2 className="text-3xl font-extrabold text-stone-900 mb-8 border-l-4 border-amber-500 pl-4 flex items-center gap-3">
                <GraduationCap size={24} className="text-amber-500" /> Education
              </h2>
              <div className="space-y-8">
                {cv.education.map((edu, i) => (
                  <div key={i} className="border-l-2 border-amber-500/20 pl-5 relative">
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 -left-[6px] top-1.5 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                    <div className="flex items-center gap-2 text-xs text-amber-600 font-bold mb-1 uppercase tracking-wider">
                      <Calendar size={13} /> {edu.period}
                    </div>
                    <h3 className="font-bold text-stone-950 text-lg">{edu.degree}</h3>
                    <p className="text-sm text-amber-600 font-semibold mt-0.5">{edu.school}</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
                      {edu.details.map((d, j) => (<li key={j}>• {d}</li>))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Work Experience */}
            <section 
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="glass-card reveal-section p-8 md:p-10 transition-all duration-300 border border-white/50"
            >
              <h2 className="text-3xl font-extrabold text-stone-900 mb-8 border-l-4 border-amber-500 pl-4 flex items-center gap-3">
                <Briefcase size={24} className="text-amber-500" /> Work Experience
              </h2>
              <div className="space-y-6">
                {cv.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-amber-500/20 pl-5 relative">
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 -left-[6px] top-1.5 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                    <div className="flex items-center gap-2 text-xs text-amber-600 font-bold mb-1 uppercase tracking-wider">
                      <Calendar size={13} /> {exp.year}
                    </div>
                    <h3 className="font-bold text-stone-950 text-lg">{exp.title}</h3>
                    <p className="text-sm text-stone-600 mt-2 leading-relaxed">{exp.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Skills Section */}
          <section 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="glass-card reveal-section p-8 md:p-10 transition-all duration-300 border border-white/50"
          >
            <h2 className="text-3xl font-extrabold text-stone-900 mb-8 border-l-4 border-amber-500 pl-4">Skills</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <h3 className="font-bold text-stone-900 mb-5 flex items-center gap-2 text-base uppercase tracking-wider">
                  <CheckCircle size={17} className="text-amber-500" /> Technical
                </h3>
                <div className="space-y-4">
                  {cv.technicalSkills.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1.5 font-medium">
                        <span className="text-stone-700">{s.name}</span>
                        <span className="text-amber-600 font-bold">{s.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-stone-900 mb-5 flex items-center gap-2 text-base uppercase tracking-wider">
                  <CheckCircle size={17} className="text-amber-500" /> Creative
                </h3>
                <div className="space-y-4">
                  {cv.creativeSkills.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1.5 font-medium">
                        <span className="text-stone-700">{s.name}</span>
                        <span className="text-orange-600 font-bold">{s.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-stone-900 mb-5 flex items-center gap-2 text-base uppercase tracking-wider">
                  <Globe size={17} className="text-amber-500" /> Languages
                </h3>
                <div className="space-y-4">
                  {cv.languages.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1.5 font-medium">
                        <span className="text-stone-700">{s.name}</span>
                        <span className="text-amber-600 font-bold">{s.level}</span>
                      </div>
                      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Certificates & Coursework */}
          {cv.certificates && cv.certificates.length > 0 && (
            <section 
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="glass-card reveal-section p-8 md:p-10 transition-all duration-300 border border-white/50"
            >
              <h2 className="text-3xl font-extrabold text-stone-900 mb-8 border-l-4 border-amber-500 pl-4 flex items-center gap-3">
                <CheckCircle size={24} className="text-amber-500" /> Certificações e Cursos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cv.certificates.map((cert, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-white/60 bg-white/40 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
                    <div>
                      {cert.imgUrl && (
                        <img src={cert.imgUrl} alt={cert.title} className="w-full h-40 object-cover rounded-xl mb-4 border border-white/60 shadow-sm" />
                      )}
                      <h3 className="font-bold text-stone-900 text-base leading-snug">{cert.title}</h3>
                      <p className="text-xs text-amber-600 font-semibold mt-1">{cert.school}</p>
                      <p className="text-[11px] text-stone-500 font-medium mt-0.5">{cert.date}</p>
                    </div>
                    {cert.fileUrl && (
                      <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="glass-btn-3d w-full mt-4 py-2 text-center text-xs uppercase tracking-wider font-bold block rounded-full">
                        Ver Certificado (PDF)
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gallery & Videos Showcase */}
          {((cv.gallery && cv.gallery.length > 0) || (cv.videos && cv.videos.length > 0)) && (
            <section 
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="glass-card reveal-section p-8 md:p-10 transition-all duration-300 border border-white/50"
            >
              <h2 className="text-3xl font-extrabold text-stone-900 mb-8 border-l-4 border-amber-500 pl-4 flex items-center gap-3">
                <Globe size={24} className="text-amber-500" /> Galeria de Média
              </h2>
              
              <div className="space-y-10">
                {/* Videos */}
                {cv.videos && cv.videos.length > 0 && (
                  <div>
                    <h3 className="font-bold text-stone-900 mb-5 text-sm uppercase tracking-widest border-b border-stone-200 pb-2">Vídeos do Portfólio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {cv.videos.map((vid, idx) => (
                        <div key={idx} className="rounded-2xl overflow-hidden border border-white/60 bg-white/40 shadow-md">
                          <video src={vid.videoUrl} controls className="w-full h-64 object-cover" />
                          <div className="p-4"><p className="font-bold text-sm text-stone-850">{vid.title}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Gallery */}
                {cv.gallery && cv.gallery.length > 0 && (
                  <div>
                    <h3 className="font-bold text-stone-900 mb-5 text-sm uppercase tracking-widest border-b border-stone-200 pb-2">Minha Galeria de Imagens</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {cv.gallery.map((img, idx) => (
                        <div key={idx} className="group relative rounded-2xl overflow-hidden border border-white/60 bg-white/40 shadow-sm aspect-square cursor-zoom-in hover:scale-[1.02] transition-transform duration-300">
                          <img src={img.imgUrl} alt={img.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center p-3 transition-opacity duration-300">
                            <p className="text-white text-xs font-bold text-center leading-snug">{img.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Contact Details */}
          <section 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="glass-card reveal-section p-8 md:p-10 transition-all duration-300 border border-white/50"
          >
            <h2 className="text-3xl font-extrabold text-stone-900 mb-8 border-l-4 border-amber-500 pl-4">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: Phone, label: "Phone", value: cv.phone },
                { icon: Mail, label: "Email", value: cv.email },
                { icon: MapPin, label: "Address", value: cv.address },
                { icon: Calendar, label: "Date of Birth", value: cv.dob },
              ].map((c) => (
                <div key={c.label} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center flex-shrink-0 border border-white/80 text-amber-500 shadow-md">
                    <c.icon size={19} />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-widest font-bold mb-1">{c.label}</p>
                    <p className="text-sm font-semibold text-stone-850">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="text-center no-print">
            <button onClick={handleDownloadPDF} className="glass-btn-3d font-bold gap-2 inline-flex items-center justify-center px-10 py-5 text-sm uppercase tracking-widest shadow-lg">
              <Download size={15} className="text-amber-500" /> Download CV as PDF
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
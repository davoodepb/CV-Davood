"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { 
  Download, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, 
  Globe, CheckCircle, Github, Linkedin, Instagram, MessageCircle, 
  Code, Palette, Camera, Music, Languages, Award, ChevronDown,
  ExternalLink, Sparkles, Zap, Target, Heart, Star, ArrowRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { EUFlag } from "@/components/EUFlag";
import { useCV } from "@/contexts/CVContext";
import defaultProfileImg from "@/assets/profile.jpg";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/>
  </svg>
);

// Animated Counter Component
const AnimatedCounter = ({ target, label, icon: Icon }: { target: number; label: string; icon: React.ElementType }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 2000;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, target]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="glass-card p-6 rounded-3xl text-center group hover:scale-105 transition-all duration-500"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-amber-500/30 transition-shadow duration-500">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <p className="text-4xl font-black text-stone-900 mb-1">{count}+</p>
      <p className="text-xs font-bold uppercase tracking-widest text-stone-500">{label}</p>
    </motion.div>
  );
};

// Timeline Item Component
const TimelineItem = ({ item, index }: { item: any; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`flex items-center gap-6 ${index % 2 === 0 ? "flex-row" : "flex-row-reverse"} md:flex-row`}
    >
      <div className="flex-1">
        <div className="glass-card p-6 rounded-3xl hover:shadow-amber-500/10 transition-all duration-500 group hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600">{item.year}</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2">{item.title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{item.desc}</p>
        </div>
      </div>
      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 flex-shrink-0 relative z-10">
        <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-20" />
      </div>
      <div className="flex-1 hidden md:block" />
    </motion.div>
  );
};

// Skill Bar Component
const SkillBar = ({ skill, index }: { skill: { name: string; pct: number }; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-stone-700">{skill.name}</span>
        <span className="text-xs font-bold text-amber-600">{skill.pct}%</span>
      </div>
      <div className="h-2 bg-stone-200/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={isInView ? { width: `${skill.pct}%` } : {}}
          transition={{ duration: 1, delay: index * 0.05, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-lg shadow-amber-500/30"
        />
      </div>
    </motion.div>
  );
};

const PremiumLanding = () => {
  const { cv } = useCV();
  const navigate = useNavigate();
  const profileImg = cv.profileImage || defaultProfileImg;
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const heroY = useTransform(smoothProgress, [0, 0.3], [0, -100]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(smoothProgress, [0, 0.2], [1, 0.9]);
  const textY = useTransform(smoothProgress, [0, 0.3], [0, -50]);
  const profileScale = useTransform(smoothProgress, [0, 0.15], [1, 1.1]);

  // Secret admin access
  const handleProfileTap = () => {
    setTapCount(prev => {
      const next = prev + 1;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => setTapCount(0), 2000);
      if (next >= 5) {
        window.sessionStorage.setItem("secret_admin_unlocked", "true");
        navigate("/admin");
        return 0;
      }
      return next;
    });
  };

  // GSAP Scroll Animations
  useEffect(() => {
    const sections = gsap.utils.toArray(".scroll-section");
    sections.forEach((section: any) => {
      gsap.fromTo(section, 
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0, duration: 1,
          scrollTrigger: { trigger: section, start: "top 85%", end: "top 50%", scrub: 1 }
        }
      );
    });

    // Floating 3D elements
    gsap.utils.toArray(".float-3d").forEach((el: any) => {
      gsap.to(el, {
        y: -20, rotationX: 5, rotationY: -5,
        duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut"
      });
    });

    // Parallax backgrounds
    gsap.utils.toArray(".parallax-bg").forEach((el: any) => {
      gsap.to(el, {
        yPercent: -30,
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(cv.name, 20, 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(150, 130, 70);
    doc.text(cv.title, 20, 33);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`📍 ${cv.location} | 📞 ${cv.phone} | ✉ ${cv.email}`, 20, 42);
    doc.setDrawColor(200, 180, 100);
    doc.line(20, 46, 190, 46);
    let y = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(50, 50, 50);
    doc.text("ABOUT ME", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const aboutLines = doc.splitTextToSize(cv.about, 170);
    doc.text(aboutLines, 20, y);
    y += aboutLines.length * 5 + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(50, 50, 50);
    doc.text("TECHNICAL SKILLS", 20, y);
    y += 8;
    doc.setFontSize(10);
    cv.technicalSkills.forEach((s) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`• ${s.name}`, 25, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150, 130, 70);
      doc.text(`${s.pct}%`, 175, y, { align: "right" });
      y += 6;
    });
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(50, 50, 50);
    doc.text("WORK EXPERIENCE", 20, y);
    y += 8;
    cv.experience.forEach((e) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`${e.year} - ${e.title}`, 25, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const descLines = doc.splitTextToSize(e.desc, 160);
      doc.text(descLines, 25, y);
      y += descLines.length * 5 + 4;
    });
    doc.save("Davood_Sharifi_CV.pdf");
  };

  const socialLinks = [
    { icon: Github, url: cv.socialLinks.github, label: "GitHub" },
    { icon: Linkedin, url: cv.socialLinks.linkedin, label: "LinkedIn" },
    { icon: Instagram, url: cv.socialLinks.instagram, label: "Instagram" },
    { icon: MessageCircle, url: cv.socialLinks.whatsapp, label: "WhatsApp" },
    { icon: TikTokIcon, url: cv.socialLinks.tiktok, label: "TikTok" },
  ].filter(l => l.url);

  return (
    <div ref={containerRef} className="min-h-screen bg-transparent text-stone-800 overflow-x-hidden">
      <Navbar />

      {/* Progress Bar */}
      <motion.div
        style={{ scaleX: smoothProgress }}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600 origin-left z-50"
      />

      {/* Floating 3D Elements */}
      <div className="fixed inset-0 pointer-events-none no-print z-0">
        <div className="float-3d absolute top-20 left-10 w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 backdrop-blur-sm border border-amber-400/20" />
        <div className="float-3d absolute top-40 right-20 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400/20 to-blue-600/10 backdrop-blur-sm border border-blue-400/20" style={{ animationDelay: "1s" }} />
        <div className="float-3d absolute bottom-40 left-1/4 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400/20 to-purple-600/10 backdrop-blur-sm border border-purple-400/20" style={{ animationDelay: "2s" }} />
        <div className="float-3d absolute top-1/3 right-1/3 w-24 h-24 rounded-full bg-gradient-to-br from-amber-400/10 to-amber-600/5 backdrop-blur-sm border border-amber-400/10" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* ===== HERO SECTION ===== */}
      <motion.section 
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden"
      >
        {/* Parallax Background */}
        <div className="parallax-bg absolute inset-0 bg-gradient-to-b from-amber-50/30 via-transparent to-transparent" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div 
            style={{ y: textY }}
            className="glass-card p-8 md:p-14 rounded-[40px] border border-white/60 bg-white/80 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
          >
            {/* Decorative gradient orb */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-amber-400/30 to-amber-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-blue-600/10 rounded-full blur-3xl" />

            {/* Europass Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-10 justify-center md:justify-start"
            >
              <EUFlag className="w-10 h-10 shadow-md rounded-sm" />
              <span className="text-amber-600 text-lg font-heading font-bold tracking-widest uppercase">Europass</span>
            </motion.div>

            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              {/* Profile Image with 3D effect */}
              <motion.div 
                style={{ scale: profileScale }}
                className="relative flex-shrink-0"
              >
                <div 
                  className="relative w-44 h-44 md:w-56 md:h-56 flex items-center justify-center cursor-pointer select-none"
                  onClick={handleProfileTap}
                >
                  {/* Animated rings */}
                  <div className="absolute inset-[-12px] rounded-full border-2 border-amber-400/20 animate-spin" style={{ animationDuration: "15s" }} />
                  <div className="absolute inset-[-8px] rounded-full border border-blue-400/20 animate-spin" style={{ animationDuration: "20s", animationDirection: "reverse" }} />
                  
                  {/* Glow */}
                  <div className="absolute inset-[-8px] rounded-full bg-gradient-to-br from-[#003399] via-[#0055cc] to-[#003399] opacity-15 blur-xl" />
                  <div className="absolute inset-[-4px] rounded-full bg-gradient-to-br from-[#003399] via-[#1a6bff] to-[#003399] shadow-[0_0_40px_rgba(0,51,153,0.4)]" />
                  
                  {/* Stars */}
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: "25s" }}>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const angle = (i * 30) * (Math.PI / 180);
                      const radius = 50;
                      const x = 50 + radius * Math.cos(angle);
                      const y = 50 + radius * Math.sin(angle);
                      return (
                        <span key={i} className="absolute text-amber-400 text-[10px] drop-shadow-[0_0_6px_rgba(212,175,55,0.9)]"
                          style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
                          ★
                        </span>
                      );
                    })}
                  </div>
                  
                  {/* Profile */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden z-10 shadow-2xl"
                    style={{ background: "linear-gradient(135deg, #003399, #1a6bff, #003399)", padding: "4px" }}
                  >
                    <img src={profileImg} alt={cv.name} className="w-full h-full object-cover rounded-full" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Text Content */}
              <div className="text-center lg:text-left flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <h1 className="text-5xl md:text-7xl font-heading font-black text-stone-900 mb-4 tracking-tight leading-tight">
                    {cv.name.split(" ").map((w, i) => (
                      <span key={i} className={i === 1 ? "text-gradient" : ""}>{w} </span>
                    ))}
                  </h1>
                  <p className="text-2xl md:text-3xl text-gradient font-bold mb-8">{cv.title}</p>
                </motion.div>

                {/* Contact Info */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-stone-600 font-medium mb-8"
                >
                  <span className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
                    <MapPin size={14} className="text-amber-500" /> {cv.location}
                  </span>
                  <span className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
                    <Phone size={14} className="text-amber-500" /> {cv.phone}
                  </span>
                  <span className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
                    <Mail size={14} className="text-amber-500" /> {cv.email}
                  </span>
                </motion.div>

                {/* Social Links */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="flex flex-wrap justify-center lg:justify-start gap-3 mb-8"
                >
                  {socialLinks.map((link, i) => (
                    <motion.a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="glass-card px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-amber-600 hover:shadow-amber-500/20 transition-all duration-300"
                    >
                      <link.icon size={14} /> {link.label}
                    </motion.a>
                  ))}
                </motion.div>

                {/* CTA Buttons */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="flex flex-wrap justify-center lg:justify-start gap-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={downloadPDF}
                    className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/30 flex items-center gap-2 hover:shadow-amber-500/50 transition-all duration-300"
                  >
                    <Download size={16} /> Download CV
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/chat")}
                    className="glass-card px-8 py-4 font-bold rounded-2xl flex items-center gap-2 hover:shadow-amber-500/20 transition-all duration-300"
                  >
                    <MessageCircle size={16} className="text-amber-500" /> Contact Me
                  </motion.button>
                </motion.div>
              </div>
            </div>

            {/* Scroll indicator */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex flex-col items-center gap-2 text-stone-400"
              >
                <span className="text-xs font-bold uppercase tracking-widest">Scroll</span>
                <ChevronDown size={16} />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ===== STATS SECTION ===== */}
      <section className="scroll-section relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <AnimatedCounter target={25} label="Projects" icon={Code} />
            <AnimatedCounter target={4} label="Years Exp" icon={Briefcase} />
            <AnimatedCounter target={3} label="Languages" icon={Languages} />
            <AnimatedCounter target={15} label="Certificates" icon={Award} />
          </div>
        </div>
      </section>

      {/* ===== ABOUT SECTION ===== */}
      <section className="scroll-section relative py-24 px-4">
        <div className="parallax-bg absolute inset-0 bg-gradient-to-b from-blue-50/20 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-4 block">About Me</span>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-stone-900 mb-6">
              Passionate About <span className="text-gradient">Creating</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass-card p-10 rounded-[32px] text-center relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-2xl" />
            <p className="text-lg text-stone-700 leading-relaxed relative z-10 max-w-2xl mx-auto">
              {cv.about}
            </p>
            <div className="flex justify-center gap-4 mt-8 relative z-10">
              {[
                { icon: Target, label: "Goal-Oriented" },
                { icon: Zap, label: "Fast Learner" },
                { icon: Heart, label: "Passionate" },
              ].map((trait, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="glass-card px-5 py-3 rounded-2xl flex items-center gap-2"
                >
                  <trait.icon size={16} className="text-amber-500" />
                  <span className="text-sm font-semibold text-stone-700">{trait.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== SKILLS SECTION ===== */}
      <section className="scroll-section relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-4 block">Expertise</span>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-stone-900">
              Skills & <span className="text-gradient">Abilities</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Technical Skills */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="glass-card p-8 rounded-3xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <Code className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">Technical Skills</h3>
                </div>
                <div className="space-y-4">
                  {cv.technicalSkills.map((skill, i) => (
                    <SkillBar key={i} skill={skill} index={i} />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Creative Skills */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="glass-card p-8 rounded-3xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">Creative Skills</h3>
                </div>
                <div className="space-y-4">
                  {cv.creativeSkills.map((skill, i) => (
                    <SkillBar key={i} skill={skill} index={i} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Languages */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10"
          >
            <div className="glass-card p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <Languages className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">Languages</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cv.languages.map((lang, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="text-center p-4 rounded-2xl bg-white/30 border border-white/40"
                  >
                    <Globe className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="font-bold text-stone-900">{lang.name}</p>
                    <p className="text-xs text-stone-500 uppercase tracking-wider">{lang.level}</p>
                    <div className="mt-2 h-1.5 bg-stone-200/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" style={{ width: `${lang.pct}%` }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== EXPERIENCE TIMELINE ===== */}
      <section className="scroll-section relative py-24 px-4">
        <div className="parallax-bg absolute inset-0 bg-gradient-to-b from-amber-50/20 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-4 block">Journey</span>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-stone-900">
              Work <span className="text-gradient">Experience</span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 to-amber-600 hidden md:block" />
            
            <div className="space-y-8">
              {cv.experience.map((item, i) => (
                <TimelineItem key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== EDUCATION SECTION ===== */}
      <section className="scroll-section relative py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-4 block">Education</span>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-stone-900">
              Academic <span className="text-gradient">Background</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {cv.education.map((edu, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -5 }}
                className="glass-card p-8 rounded-3xl group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg group-hover:shadow-amber-500/30 transition-shadow">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-600">{edu.period}</span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-2">{edu.degree}</h3>
                <p className="text-sm text-stone-600 mb-4">{edu.school}</p>
                {edu.details.length > 0 && (
                  <ul className="space-y-2">
                    {edu.details.map((d, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-stone-600">
                        <CheckCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="scroll-section relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-card p-12 rounded-[40px] text-center relative overflow-hidden"
          >
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <Sparkles className="w-12 h-12 text-amber-500 mx-auto mb-6" />
              <h2 className="text-4xl md:text-5xl font-heading font-black text-stone-900 mb-6">
                Let's Build Something <span className="text-gradient">Amazing</span>
              </h2>
              <p className="text-lg text-stone-600 mb-10 max-w-xl mx-auto">
                Open to collaborations, freelance projects, and exciting opportunities.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/chat")}
                  className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/30 flex items-center gap-2"
                >
                  <MessageCircle size={16} /> Let's Talk
                  <ArrowRight size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={downloadPDF}
                  className="glass-card px-8 py-4 font-bold rounded-2xl flex items-center gap-2"
                >
                  <Download size={16} className="text-amber-500" /> Download CV
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  );
};

export default PremiumLanding;

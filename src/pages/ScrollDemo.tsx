import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Award, Code, Briefcase, GraduationCap, Globe, Sparkles } from "lucide-react";

export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden pb-[300px] pt-[800px]">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-stone-900 dark:text-white">
              Crafting Digital <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-gradient">
                Experiences
              </span>
            </h1>
            <p className="text-stone-600 mt-4 text-lg max-w-md mx-auto">
              Full-stack development meets creative design
            </p>
          </>
        }
      >
        <div className="h-full w-full bg-gradient-to-br from-amber-50 via-white to-amber-50/50 p-8 flex flex-col justify-between">
          {/* Top row - Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: Code, label: "Projects", value: "25+" },
              { icon: Briefcase, label: "Experience", value: "4+ Years" },
              { icon: GraduationCap, label: "Education", value: "CS Student" },
              { icon: Globe, label: "Languages", value: "3 Fluent" },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-4 rounded-2xl text-center">
                <stat.icon className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
                <p className="text-xs text-stone-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Center - Featured Project */}
          <div className="flex-1 flex items-center justify-center">
            <div className="glass-card rounded-3xl p-8 max-w-lg text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">CV Portfolio</h3>
              <p className="text-stone-600 text-sm mb-4">
                Modern, interactive resume built with React, TypeScript, and Tailwind CSS
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["React", "TypeScript", "Tailwind", "Firebase", "GSAP"].map((tag) => (
                  <span key={tag} className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row - Quick Links */}
          <div className="flex justify-center gap-4 mt-6">
            {[
              { icon: Award, label: "Certificates" },
              { icon: Code, label: "Skills" },
              { icon: Briefcase, label: "Experience" },
            ].map((item, i) => (
              <div key={i} className="glass-card px-5 py-3 rounded-full flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer">
                <item.icon className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-stone-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </ContainerScroll>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { CheckCircle, Award, Shield, Mail, Phone, MapPin } from "lucide-react";
import quickappLogo from "@/assets/quickapp-logo-full-yellow-black.png";

export const WebsiteFooter = () => {
  const navigate = useNavigate();

  const footerLinks = {
    solutions: [
      { label: "Field Sales Automation", href: "/solutions/field-sales" },
      { label: "Distributor Management System", href: "/solutions/distributor-portal" },
      { label: "Retailer Portal", href: "/solutions/retailer-portal" },
      { label: "Van Sales", href: "/solutions/van-sales" },
      { label: "Professional Services", href: "/solutions/professional-services" },
    ],
    platform: [
      { label: "Enterprise AI", href: "/features" },
      { label: "Technology", href: "/technology" },
      { label: "Connectors", href: "/connectors" },
      { label: "Pricing", href: "/pricing" },
    ],
    resources: [
      { label: "Insights", href: "/insights" },
      { label: "ROI Calculator", href: "/roi-calculator" },
      { label: "Migration Plan", href: "/migration-plan" },
      { label: "Request Demo", href: "/request-demo" },
    ],
    company: [
      { label: "About Us", href: "/" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ]
  };

  return (
    <footer className="bg-slate-900 text-slate-200">
      {/* Main Footer */}
      <div className="container mx-auto px-3 sm:px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src={quickappLogo} 
                alt="QuickApp.AI" 
                className="h-10 w-10 rounded-lg"
              />
            <div>
                <h3 className="text-lg font-bold text-white">QuickApp<span className="text-accent-gold">.ai</span></h3>
                <p className="text-xs text-slate-400">AI-Powered Field Sales Platform</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Empowering field sales teams with AI-driven insights, intelligent route planning, 
              and comprehensive performance analytics — even offline.
            </p>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>hello@quickapp.ai</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+91 63616 80976</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Bangalore, India</span>
              </div>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-semibold text-white mb-4">Solutions</h4>
            <ul className="space-y-2">
              {footerLinks.solutions.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-2">
              {footerLinks.platform.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="border-t border-slate-800">
        <div className="container mx-auto px-3 sm:px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent-gold" />
              <span>Salesforce Certified Partner</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent-gold" />
              <span>ISO 27001 Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-accent-gold" />
              <span>GDPR Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-slate-800 bg-slate-950">
        <div className="container mx-auto px-3 sm:px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <p>© 2026 QuickApp.AI. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/contact" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, FileText, Zap } from "lucide-react";
import LoadingScreen from "@/components/loading-screen";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } }
  };

  const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const features = [
    {
      icon: Smartphone,
      title: "Responsive Design",
      description: "Perfectly optimized for all screen sizes, from mobile phones to large desktop displays."
    },
    {
      icon: FileText,
      title: "Professional Typography",
      description: "Beautiful Inter font with carefully chosen weights and spacing for optimal readability."
    },
    {
      icon: Zap,
      title: "Smooth Animations",
      description: "Subtle transitions and animations that enhance the user experience without distraction."
    }
  ];

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">SA</span>
              </div>
              <span className="font-semibold text-lg text-zinc-900">Simple App</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Home</a>
              <a href="#" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Features</a>
              <a href="#" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors duration-200">About</a>
            </nav>
            
            <button className="md:hidden p-2 rounded-lg hover:bg-zinc-100 transition-colors duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 mb-6"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
              >
                Welcome to{" "}
                <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent">
                  Simple App
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-lg sm:text-xl text-zinc-600 mb-12 max-w-2xl mx-auto leading-relaxed"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                A clean, modern application designed with professional typography and responsive layouts. 
                Experience simplicity at its finest.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
              >
                <Button 
                  className="px-8 py-3 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  size="lg"
                >
                  Get Started
                </Button>
                <Button 
                  variant="outline"
                  className="px-8 py-3 border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 hover:border-zinc-400 transition-all duration-200"
                  size="lg"
                >
                  Learn More
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
                  Built for Excellence
                </h2>
                <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
                  Every detail has been carefully crafted to provide the best user experience across all devices.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    <Card className="group p-8 rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:shadow-lg transition-all duration-300 h-full">
                      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-zinc-200 transition-colors duration-200">
                        <feature.icon className="w-6 h-6 text-zinc-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-zinc-900 mb-3">{feature.title}</h3>
                      <p className="text-zinc-600 leading-relaxed">{feature.description}</p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-zinc-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-2">99.9%</div>
                  <div className="text-sm text-zinc-600">Uptime</div>
                </motion.div>
                
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-2">&lt; 100ms</div>
                  <div className="text-sm text-zinc-600">Load Time</div>
                </motion.div>
                
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-2">10K+</div>
                  <div className="text-sm text-zinc-600">Users</div>
                </motion.div>
                
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-2">5.0</div>
                  <div className="text-sm text-zinc-600">Rating</div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div className="md:col-span-1">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">SA</span>
                  </div>
                  <span className="font-semibold text-lg text-zinc-900">Simple App</span>
                </div>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Clean, modern design meets professional functionality. Built for the future.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-zinc-900 mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Features</a></li>
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Pricing</a></li>
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Documentation</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-zinc-900 mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">About</a></li>
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Blog</a></li>
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Careers</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-zinc-900 mb-4">Support</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Help Center</a></li>
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Contact</a></li>
                  <li><a href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors duration-200">Status</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-zinc-200 pt-8 flex flex-col sm:flex-row justify-between items-center">
              <p className="text-sm text-zinc-500">© 2024 Simple App. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 sm:mt-0">
                <a href="#" className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors duration-200">Privacy</a>
                <a href="#" className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors duration-200">Terms</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

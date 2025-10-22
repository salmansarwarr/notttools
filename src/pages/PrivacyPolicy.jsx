import React from "react";
import {
  Shield,
  Database,
  Lock,
  Eye,
  Settings,
  Mail,
  Globe,
  UserCheck,
} from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E]">
      {/* Hero Section */}
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-2xl px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-medium">
                Data Protection
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Privacy Policy
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              How we collect, use, and protect your personal information
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Introduction Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Our Commitment</h2>
            </div>

            <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-6">
              <p className="text-green-200 text-lg leading-relaxed">
                At <strong>NOOTTOOLS SL</strong>, we are committed to protecting
                the privacy of our users. This Privacy Policy explains how we
                collect, use, and safeguard the personal information you provide
                through our application.
              </p>
            </div>
          </div>

          {/* Information We Collect Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Information We Collect
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Database className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-blue-300">
                    Required Data
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-200 font-medium mb-2">
                      Wallet Address
                    </h4>
                    <p className="text-gray-300 text-sm">
                      Used as a unique user identifier for our services
                    </p>
                  </div>
                  <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="text-purple-200 font-medium mb-2">
                      Contact Information
                    </h4>
                    <p className="text-gray-300 text-sm">
                      Email address or Telegram username for notifications
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-300">
                    Data Minimization
                  </h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  We are committed to data minimization and only collect
                  information that is{" "}
                  <strong>necessary for the operation</strong> of our services.
                </p>
                <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-200 text-sm">
                    <strong>Promise:</strong> We do not collect unnecessary
                    personal data or engage in excessive data processing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Use of Information Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                How We Use Your Information
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <UserCheck className="w-5 h-5" />,
                  title: "Authentication",
                  desc: "User identification and secure authentication",
                  color: "blue",
                },
                {
                  icon: <Mail className="w-5 h-5" />,
                  title: "Notifications",
                  desc: "Sending relevant updates via email or Telegram",
                  color: "purple",
                },
                {
                  icon: <Settings className="w-5 h-5" />,
                  title: "Service Improvement",
                  desc: "Providing and enhancing our platform services",
                  color: "green",
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: "Security",
                  desc: "Ensuring platform security and preventing fraud",
                  color: "red",
                },
                {
                  icon: <Lock className="w-5 h-5" />,
                  title: "Legal Compliance",
                  desc: "Complying with legal obligations when required",
                  color: "orange",
                },
                {
                  icon: <Eye className="w-5 h-5" />,
                  title: "No Profiling",
                  desc: "We do not engage in automated decision-making",
                  color: "cyan",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-${item.color}-500/30 transition-all duration-300`}
                >
                  <div
                    className={`w-10 h-10 bg-${item.color}-500/20 rounded-lg flex items-center justify-center mb-4`}
                  >
                    <span className={`text-${item.color}-400`}>
                      {item.icon}
                    </span>
                  </div>
                  <h3
                    className={`text-lg font-semibold text-${item.color}-300 mb-3`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-6">
              <p className="text-yellow-200 text-sm">
                <strong>Marketing Notice:</strong> We do not use your personal
                information for marketing purposes without your explicit
                consent, nor do we engage in profiling that could significantly
                affect you.
              </p>
            </div>
          </div>

          {/* Data Protection Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Data Protection & Security
              </h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-red-300 mb-4">
                  Security Measures
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    "Encryption of data both in transit and at rest",
                    "Regular security audits and vulnerability assessments",
                    "Access controls and authentication mechanisms",
                    "Secure backup and disaster recovery procedures",
                    "Employee training on data protection practices",
                    "Compliance with industry security standards",
                  ].map((measure, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-red-600/10 border border-red-500/20 rounded-lg p-3"
                    >
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-gray-300 text-sm">{measure}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-orange-300 mb-4">
                  Data Storage
                </h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  All collected information is stored in our secure database and
                  is <strong>not shared with third parties</strong>. We
                  implement appropriate security measures to protect your data
                  from unauthorized access, alteration, disclosure, or
                  destruction.
                </p>
                <div className="bg-orange-600/20 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-orange-200 text-sm">
                    <strong>Retention Policy:</strong> We retain your personal
                    information only for as long as necessary to fulfill the
                    purposes outlined in this Privacy Policy and comply with
                    legal obligations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Your Rights Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Your Rights</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Right to Access",
                  desc: "Request a copy of the personal data we hold about you",
                  icon: <Eye className="w-5 h-5" />,
                },
                {
                  title: "Right to Rectification",
                  desc: "Request correction of inaccurate or incomplete data",
                  icon: <Settings className="w-5 h-5" />,
                },
                {
                  title: "Right to Erasure",
                  desc: "Request deletion of your personal data under certain circumstances",
                  icon: <UserCheck className="w-5 h-5" />,
                },
                {
                  title: "Right to Restrict Processing",
                  desc: "Request limitation of how we process your data",
                  icon: <Lock className="w-5 h-5" />,
                },
                {
                  title: "Right to Data Portability",
                  desc: "Request transfer of your data to another service provider",
                  icon: <Globe className="w-5 h-5" />,
                },
                {
                  title: "Right to Object",
                  desc: "Object to certain types of data processing",
                  icon: <Shield className="w-5 h-5" />,
                },
              ].map((right, index) => (
                <div
                  key={index}
                  className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-cyan-400">{right.icon}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-cyan-300">
                      {right.title}
                    </h4>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {right.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-cyan-600/10 border border-cyan-500/30 rounded-xl p-6">
              <p className="text-cyan-200 leading-relaxed">
                <strong>Exercise Your Rights:</strong> To exercise these rights,
                please contact us using the information provided below. We will
                respond to your request within the timeframe required by
                applicable law (typically within 30 days).
              </p>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Contact Information
              </h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed mb-6">
                  If you have any questions, concerns, or requests regarding
                  this Privacy Policy or our data practices, please contact us:
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="w-5 h-5 text-purple-400" />
                      <h4 className="text-purple-300 font-semibold">
                        Email Contact
                      </h4>
                    </div>
                    <a
                      href="mailto:noot@noottools.io"
                      className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
                    >
                      noot@noottools.io
                    </a>
                    <p className="text-gray-400 text-sm mt-2">
                      Response time: Within 30 days
                    </p>
                  </div>

                  <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <h4 className="text-blue-300 font-semibold">
                        Postal Address
                      </h4>
                    </div>
                    <p className="text-gray-300">
                      Calle Campo Sagrado, 11 - 4º D<br />
                      33205 Gijón, Asturias, Spain
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-green-300 mb-4">
                  Data Protection Officer
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  For matters specifically related to data protection, you may
                  also contact our Data Protection Officer at the same contact
                  information provided above.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-gray-700">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

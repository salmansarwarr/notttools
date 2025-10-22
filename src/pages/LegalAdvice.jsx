import React from 'react';
import { AlertTriangle, Shield, Info, ExternalLink, FileX, Scale } from 'lucide-react';

const LegalAdvice = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E]">
      {/* Hero Section */}
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-red-300 font-medium">Legal Disclaimers</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                Legal Advice
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Important disclaimers and legal information for using our platform
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">

          {/* Important Notice Banner */}
          <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-red-200 mb-4">Critical Notice</h3>
                <p className="text-red-100 text-lg leading-relaxed">
                  <strong>This is not financial or investment advice.</strong> Please consult with qualified professionals 
                  before making any investment decisions. All content is for informational purposes only.
                </p>
              </div>
            </div>
          </div>
          
          {/* Content Disclaimer Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Info className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Content Disclaimer</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">Information Purpose Only</h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  All content on our website and platforms, including hyperlinks, applications, forums, blogs, social networks, 
                  and other platforms associated with NOOTTOOLS, is intended <strong>solely to provide users with general information</strong> 
                  and is in no way aimed at the commercialization of specific products.
                </p>
                <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm">
                    <strong>Accuracy Notice:</strong> We cannot guarantee the accuracy, precision, or timeliness of published data. 
                    Information should not be interpreted as financial, legal, or investment advice.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">No Investment Recommendations</h3>
                <p className="text-gray-300 leading-relaxed">
                  The publication of information by NOOTTOOLS does not imply, nor should it be interpreted as, financial, legal, 
                  or any other type of advice regarding the suitability of investing in the markets and products mentioned.
                </p>
              </div>
            </div>
          </div>

          {/* User Responsibility Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">User Responsibility</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-orange-300 mb-4">Own Risk and Responsibility</h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Any use or exploitation of the information provided will be carried out at the <strong>user's own risk and responsibility</strong>. 
                  Users interested in investing must conduct their own research and analysis, reviewing and verifying such data and content before relying on it.
                </p>
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-200 text-sm">
                    <strong>High Risk Warning:</strong> Commercial transactions involve very high risk and may result in significant losses. 
                    Seek appropriate professional advice before making any decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Investment Warning Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FileX className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Investment Warning</h2>
            </div>

            <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-6 mb-6">
              <p className="text-red-200 font-medium text-center text-lg">
                <strong>Nothing contained on our website constitutes or should be considered an invitation or offer to make investments.</strong>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { 
                  title: "Market Volatility", 
                  desc: "Cryptocurrency prices can fluctuate dramatically within short periods, potentially resulting in significant financial loss.",
                  color: "red"
                },
                { 
                  title: "Regulatory Risk", 
                  desc: "Changes in regulations may affect the legality or value of digital assets in your jurisdiction.",
                  color: "orange"
                },
                { 
                  title: "Technology Risk", 
                  desc: "Blockchain technologies are evolving and may contain undiscovered vulnerabilities or technical issues.",
                  color: "yellow"
                },
                { 
                  title: "Liquidity Risk", 
                  desc: "Some digital assets may be difficult to sell quickly without significantly affecting their market price.",
                  color: "red"
                },
                { 
                  title: "Operational Risk", 
                  desc: "Technical failures, security breaches, or human errors may result in permanent loss of funds.",
                  color: "orange"
                },
                { 
                  title: "Counterparty Risk", 
                  desc: "Third-party service providers may fail to meet their obligations, affecting your investments.",
                  color: "yellow"
                }
              ].map((risk, index) => (
                <div key={index} className={`bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-${risk.color}-500/30 transition-all duration-300`}>
                  <h4 className={`text-lg font-semibold text-${risk.color}-300 mb-3`}>{risk.title}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{risk.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Compliance Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Legal Compliance</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-green-300 mb-4">User Obligations</h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Users are responsible for ensuring their activities comply with applicable laws and regulations in their jurisdiction. 
                  NOOTTOOLS does not provide legal advice and users should consult with qualified legal professionals regarding compliance matters.
                </p>
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-200 text-sm">
                    <strong>Important:</strong> The legal status of cryptocurrencies varies by jurisdiction and may be subject to change. 
                    Stay informed about relevant legal developments in your area.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">No Professional Relationship</h3>
                <p className="text-gray-300 leading-relaxed">
                  The information provided through NOOTTOOLS does not create any professional relationship between the company and users. 
                  Users should not rely on this information as a substitute for professional advice tailored to their specific circumstances.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Contact for Legal Matters</h2>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <p className="text-gray-300 leading-relaxed mb-6">
                For legal inquiries, concerns, or professional advice, please contact qualified professionals or reach out to us:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-300 font-semibold mb-2">Email Contact</h4>
                  <a href="mailto:noot@noottools.io" className="text-blue-400 hover:text-blue-300 transition-colors">
                    noot@noottools.io
                  </a>
                </div>
                
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-300 font-semibold mb-2">Postal Address</h4>
                  <p className="text-gray-300 text-sm">
                    Calle Campo Sagrado, 11 - 4º D<br />
                    33205 Gijón, Asturias, Spain
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-700">
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

export default LegalAdvice;

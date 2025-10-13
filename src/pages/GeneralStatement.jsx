import React from "react";
import {
  FileText,
  Building2,
  Mail,
  AlertTriangle,
  Scale,
  Shield,
} from "lucide-react";

const GeneralStatement = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E]">
      {/* Hero Section */}
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-purple-300 font-medium">
                Legal Documentation
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                General Statement
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Official terms, conditions, and important information about
              NOOTTOOLS SL
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Identification Data Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Identification Data
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">
                  Company Information
                </h3>
                <div className="space-y-4 text-gray-300">
                  <p>
                    This website is owned by{" "}
                    <span className="text-white font-semibold">
                      NOOTTOOLS SL
                    </span>{" "}
                    (hereinafter, the "Company"). Through this website, the
                    Company provides its users with an information society
                    service, electronically and at the user's individual
                    request, within the framework of an economic activity proper
                    to a commercial company.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">
                  Contact Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <a
                      href="mailto:noot@noottools.io"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      noot@noottools.io
                    </a>
                  </div>
                  <div className="text-gray-300">
                    <strong>Address:</strong>
                    <br />
                    Calle Campo Sagrado, núm. 11, 4º D<br />
                    33205 Gijón (Asturias) – SPAIN
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-xl font-semibold text-cyan-300 mb-4">
                Legal Registration
              </h3>
              <div className="grid md:grid-cols-2 gap-6 text-gray-300">
                <div>
                  <p>
                    <strong>Tax ID:</strong> B-22808646
                  </p>
                  <p>
                    <strong>Incorporation:</strong> July 30, 2025
                  </p>
                </div>
                <div>
                  <p>
                    <strong>CNAE:</strong> 6201 – Computer Programming
                    Activities
                  </p>
                  <p>
                    <strong>SIC:</strong> 7372
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Terms and Conditions
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">
                  Acceptance of Terms
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Any person who accesses and uses this website declares that
                  they understand and accept these "General Conditions", which
                  are available to any user through its Legal Notice.
                  Understanding and accepting these General Conditions are a
                  necessary prerequisite for accessing the information society
                  services offered by NOOTTOOLS SL.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">
                  Website Ownership
                </h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  This website (www.noottools.io) is the exclusive property of
                  NOOTTOOLS SL. All intellectual property rights, exploitation
                  rights, and reproduction rights over this website, as well as
                  its content, appearance, and design, belong solely to the
                  Company.
                </p>
                <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm">
                    <strong>Important:</strong> Any improper or unauthorized use
                    of this website or its contents may be prosecuted in
                    accordance with applicable law.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-cyan-300 mb-4">
                  Scope of Website
                </h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  All information provided through this website is intended for{" "}
                  <strong>informational purposes only</strong>. The content does
                  not constitute legal, financial, or investment advice
                  regarding the cryptocurrency market.
                </p>
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-200 text-sm">
                    <strong>Disclaimer:</strong> Users are solely responsible
                    for seeking appropriate advice on risks, applicable
                    regulations, and functioning of cryptoasset markets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Warning Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Important Risk Notice
              </h2>
            </div>

            <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-6 mb-6">
              <p className="text-red-200 font-medium mb-4">
                <strong>
                  NOOTTOOLS SL expressly warns users about the risks related to
                  cryptocurrency markets and cryptoassets:
                </strong>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Volatility Risk",
                  desc: "Investments may fluctuate significantly and investors may lose their entire investment.",
                },
                {
                  title: "Startup Risk",
                  desc: "Early-stage projects entail high risk, requiring thorough understanding of business models.",
                },
                {
                  title: "Lack of Protection",
                  desc: "Cryptoassets are not covered by customer protection mechanisms like deposit guarantees.",
                },
                {
                  title: "Liquidity Risk",
                  desc: "Many cryptoassets suffer from low liquidity, making it difficult to sell without losses.",
                },
                {
                  title: "Technology Risk",
                  desc: "Distributed ledger technologies may present operational or security vulnerabilities.",
                },
                {
                  title: "Cybersecurity Risk",
                  desc: "Theft of private keys or credentials could result in irretrievable loss of funds.",
                },
              ].map((risk, index) => (
                <div
                  key={index}
                  className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 hover:border-red-500/30 transition-all duration-300"
                >
                  <h4 className="text-lg font-semibold text-red-300 mb-3">
                    {risk.title}
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {risk.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Information Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Governing Law</h2>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <p className="text-gray-300 leading-relaxed mb-4">
                This legal notice and the NOOTTOOLS SL website are governed by{" "}
                <strong className="text-white">Spanish law</strong>. Any
                disputes that may arise between the Company and users shall be
                submitted to the courts and tribunals of
                <strong className="text-white"> Asturias, Spain</strong>, with
                the express waiver of any other jurisdiction that may apply.
              </p>

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

export default GeneralStatement;

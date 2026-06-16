import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Shield, Info, ExternalLink, FileX, Scale } from 'lucide-react';

const LegalAdvice = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E]">
      {/* Hero Section */}
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-red-300 font-medium">{t("legal_disclaimers")}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">{t("legal_advice_title")}</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">{t("legal_advice_desc")}</p>
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
                <h3 className="text-2xl font-bold text-red-200 mb-4">{t("critical_notice")}</h3>
                <p className="text-red-100 text-lg leading-relaxed"><strong>{t("critical_notice_desc_1")}</strong> {t("critical_notice_desc_2")}</p>
              </div>
            </div>
          </div>
          
          {/* Content Disclaimer Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Info className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t("content_disclaimer")}</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">{t("information_purpose_only")}</h3>
                <p className="text-gray-300 leading-relaxed mb-4">{t("information_purpose_desc_1")} <strong>{t("information_purpose_desc_2")}</strong> {t("information_purpose_desc_3")}</p>
                <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm"><strong>{t("accuracy_notice")}:</strong> {t("accuracy_notice_desc")}</p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">{t("no_investment_recommendations")}</h3>
                <p className="text-gray-300 leading-relaxed">{t("no_investment_recommendations_desc")}</p>
              </div>
            </div>
          </div>

          {/* User Responsibility Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t("user_responsibility")}</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-orange-300 mb-4">{t("own_risk_and_responsibility")}</h3>
                <p className="text-gray-300 leading-relaxed mb-4">{t("own_risk_and_responsibility_desc_1")} <strong>{t("own_risk_and_responsibility_desc_2")}</strong>. {t("own_risk_and_responsibility_desc_3")}</p>
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-200 text-sm"><strong>{t("high_risk_warning")}:</strong> {t("high_risk_warning_desc")}</p>
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
              <h2 className="text-3xl font-bold text-white">{t("investment_warning")}</h2>
            </div>

            <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-6 mb-6">
              <p className="text-red-200 font-medium text-center text-lg"><strong>{t("investment_warning_desc")}</strong></p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { 
                  title: t("market_volatility"), 
                  desc: t("market_volatility_desc"),
                  color: "red"
                },
                { 
                  title: t("regulatory_risk"), 
                  desc: t("regulatory_risk_desc"),
                  color: "orange"
                },
                { 
                  title: t("technology_risk"), 
                  desc: t("blockchain_technology_risk_desc"),
                  color: "yellow"
                },
                { 
                  title: t("liquidity_risk"), 
                  desc: t("liquidity_risk_desc2"),
                  color: "red"
                },
                { 
                  title: t("operational_risk"), 
                  desc: t("operational_risk_desc"),
                  color: "orange"
                },
                { 
                  title: t("counterparty_risk"), 
                  desc: t("counterparty_risk_desc"),
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
              <h2 className="text-3xl font-bold text-white">{t("legal_compliance")}</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-green-300 mb-4">{t("user_obligations")}</h3>
                <p className="text-gray-300 leading-relaxed mb-4">{t("user_obligations_desc")}</p>
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-200 text-sm"><strong>{t("important_label")}</strong> {t("legal_important_desc")}</p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">{t("no_professional_relationship")}</h3>
                <p className="text-gray-300 leading-relaxed">{t("no_professional_relationship_desc")}</p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t("contact_for_legal_matters")}</h2>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <p className="text-gray-300 leading-relaxed mb-6">{t("contact_for_legal_matters_desc")}</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-300 font-semibold mb-2">{t("email_contact")}</h4>
                  <a href="mailto:noot@noottools.io" className="text-blue-400 hover:text-blue-300 transition-colors">
                    noot@noottools.io
                  </a>
                </div>
                
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-300 font-semibold mb-2">{t("postal_address")}</h4>
                  <p className="text-gray-300 text-sm">{t("postal_address_line1")}<br />{t("postal_address_line2")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-700">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">{t("last_updated")} {new Date().toLocaleDateString()}
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

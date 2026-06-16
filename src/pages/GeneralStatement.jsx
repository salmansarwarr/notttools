import React from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Building2,
  Mail,
  AlertTriangle,
  Scale,
  Shield,
} from "lucide-react";

const GeneralStatement = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E]">
      {/* Hero Section */}
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-purple-300 font-medium">{t("legal_documentation")}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">{t("general_statement_title")}</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">{t("general_statement_desc")}</p>
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
              <h2 className="text-3xl font-bold text-white">{t("identification_data")}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">{t("company_information")}</h3>
                <div className="space-y-4 text-gray-300">
                  <p>{t("website_owned_by_1")} {" "}
                    <span className="text-white font-semibold">
                      NOOTTOOLS SL
                    </span>{" "}{t("website_owned_by_2")}</p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">{t("contact_details")}</h3>
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
                  <div className="text-gray-300"><strong>{t("address")}</strong> <br />{t("address_line1")}<br />{t("address_line2")}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-xl font-semibold text-cyan-300 mb-4">{t("legal_registration")}</h3>
              <div className="grid md:grid-cols-2 gap-6 text-gray-300">
                <div>
                  <p><strong>{t("tax_id")}</strong> B-22808646</p>
                  <p><strong>{t("incorporation")}</strong> {t("incorporation_date")}</p>
                </div>
                <div>
                  <p><strong>{t("cnae")}</strong> {t("cnae_desc")}</p>
                  <p><strong>{t("sic")}</strong> 7372</p>
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
              <h2 className="text-3xl font-bold text-white">{t("terms_and_conditions")}</h2>
            </div>

            <div className="space-y-8">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-purple-300 mb-4">{t("acceptance_of_terms")}</h3>
                <p className="text-gray-300 leading-relaxed">{t("acceptance_of_terms_desc")}</p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-300 mb-4">{t("website_ownership")}</h3>
                <p className="text-gray-300 leading-relaxed mb-4">{t("website_ownership_desc")}</p>
                <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm"><strong>{t("important_label")}</strong> {t("improper_use_warning")}</p>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-cyan-300 mb-4">{t("scope_of_website")}</h3>
                <p className="text-gray-300 leading-relaxed mb-4">{t("scope_info_1")} {" "}
                  <strong>{t("informational_purposes_only")}</strong>{t("scope_info_2")}</p>
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-200 text-sm"><strong>{t("disclaimer_label")}</strong> {t("users_solely_responsible")}</p>
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
              <h2 className="text-3xl font-bold text-white">{t("important_risk_notice")}</h2>
            </div>

            <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-6 mb-6">
              <p className="text-red-200 font-medium mb-4">
                <strong>{t("risk_warning_intro")}</strong>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: t("volatility_risk"),
                  desc: t("volatility_risk_desc"),
                },
                {
                  title: t("startup_risk"),
                  desc: t("startup_risk_desc"),
                },
                {
                  title: t("lack_of_protection"),
                  desc: t("lack_of_protection_desc"),
                },
                {
                  title: t("liquidity_risk"),
                  desc: t("liquidity_risk_desc"),
                },
                {
                  title: t("technology_risk"),
                  desc: t("technology_risk_desc"),
                },
                {
                  title: t("cybersecurity_risk"),
                  desc: t("cybersecurity_risk_desc"),
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
              <h2 className="text-3xl font-bold text-white">{t("governing_law")}</h2>
            </div>

            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <p className="text-gray-300 leading-relaxed mb-4">{t("governing_law_1")} {" "}
                <strong className="text-white">{t("spanish_law")}</strong>{t("governing_law_2")}<strong className="text-white">{t("asturias_spain")}</strong>{t("governing_law_3")}</p>

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

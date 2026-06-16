import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E]">
      {/* Hero Section */}
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-2xl px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-medium">{t("data_protection")}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">{t("privacy_policy")}</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">{t("privacy_policy_desc")}</p>
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
              <h2 className="text-3xl font-bold text-white">{t("our_commitment")}</h2>
            </div>

            <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-6">
              <p className="text-green-200 text-lg leading-relaxed">At <strong>NOOTTOOLS SL</strong>, {t("our_commitment_desc")}</p>
            </div>
          </div>

          {/* Information We Collect Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t("information_we_collect")}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Database className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-blue-300">{t("required_data")}</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-200 font-medium mb-2">{t("wallet_address_privacy")}</h4>
                    <p className="text-gray-300 text-sm">{t("wallet_address_desc")}</p>
                  </div>
                  <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="text-purple-200 font-medium mb-2">{t("contact_information")}</h4>
                    <p className="text-gray-300 text-sm">{t("contact_information_desc")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-300">{t("data_minimization")}</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  We are committed to data minimization and only collect
                  information that is{" "}
                  <strong>necessary for the operation</strong> of our services.
                </p>
                <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-200 text-sm"><strong>{t("promise")}:</strong> {t("data_minimization_promise")}</p>
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
              <h2 className="text-3xl font-bold text-white">{t("how_we_use_your_info")}</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <UserCheck className="w-5 h-5" />,
                  title: t("authentication"),
                  desc: t("authentication_desc"),
                  color: "blue",
                },
                {
                  icon: <Mail className="w-5 h-5" />,
                  title: t("notifications"),
                  desc: t("notifications_desc"),
                  color: "purple",
                },
                {
                  icon: <Settings className="w-5 h-5" />,
                  title: t("service_improvement"),
                  desc: t("service_improvement_desc"),
                  color: "green",
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: t("security"),
                  desc: t("security_desc"),
                  color: "red",
                },
                {
                  icon: <Lock className="w-5 h-5" />,
                  title: t("legal_compliance"),
                  desc: t("legal_compliance_desc"),
                  color: "orange",
                },
                {
                  icon: <Eye className="w-5 h-5" />,
                  title: t("no_profiling"),
                  desc: t("no_profiling_desc"),
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
              <p className="text-yellow-200 text-sm"><strong>{t("marketing_notice")}:</strong> {t("marketing_notice_desc")}</p>
            </div>
          </div>

          {/* Data Protection Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 mb-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t("data_protection_security")}</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-red-300 mb-4">{t("security_measures")}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    t("security_measure_1"),
                    t("security_measure_2"),
                    t("security_measure_3"),
                    t("security_measure_4"),
                    t("security_measure_5"),
                    t("security_measure_6"),
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
                <h3 className="text-xl font-semibold text-orange-300 mb-4">{t("data_storage")}</h3>
                <p className="text-gray-300 leading-relaxed mb-4">{t("data_storage_desc_1")} <strong>{t("data_storage_desc_2")}</strong>. {t("data_storage_desc_3")}</p>
                <div className="bg-orange-600/20 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-orange-200 text-sm"><strong>{t("retention_policy")}:</strong> {t("retention_policy_desc")}</p>
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
              <h2 className="text-3xl font-bold text-white">{t("your_rights")}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: t("right_to_access"),
                  desc: t("right_to_access_desc"),
                  icon: <Eye className="w-5 h-5" />,
                },
                {
                  title: t("right_to_rectification"),
                  desc: t("right_to_rectification_desc"),
                  icon: <Settings className="w-5 h-5" />,
                },
                {
                  title: t("right_to_erasure"),
                  desc: t("right_to_erasure_desc"),
                  icon: <UserCheck className="w-5 h-5" />,
                },
                {
                  title: t("right_to_restrict_processing"),
                  desc: t("right_to_restrict_processing_desc"),
                  icon: <Lock className="w-5 h-5" />,
                },
                {
                  title: t("right_to_data_portability"),
                  desc: t("right_to_data_portability_desc"),
                  icon: <Globe className="w-5 h-5" />,
                },
                {
                  title: t("right_to_object"),
                  desc: t("right_to_object_desc"),
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
              <p className="text-cyan-200 leading-relaxed"><strong>{t("exercise_your_rights")}:</strong> {t("exercise_your_rights_desc")}</p>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl p-8 hover:border-gray-600 transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t("contact_information")}</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <p className="text-gray-300 leading-relaxed mb-6">{t("contact_information_text")}</p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="w-5 h-5 text-purple-400" />
                      <h4 className="text-purple-300 font-semibold">{t("email_contact")}</h4>
                    </div>
                    <a
                      href="mailto:noot@noottools.io"
                      className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
                    >
                      noot@noottools.io
                    </a>
                    <p className="text-gray-400 text-sm mt-2">{t("response_time_30_days")}</p>
                  </div>

                  <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <h4 className="text-blue-300 font-semibold">{t("postal_address")}</h4>
                    </div>
                    <p className="text-gray-300">{t("postal_address_line1")}<br />{t("postal_address_line2")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-green-300 mb-4">{t("data_protection_officer")}</h3>
                <p className="text-gray-300 leading-relaxed">{t("dpo_desc")}</p>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-gray-700">
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

export default PrivacyPolicy;

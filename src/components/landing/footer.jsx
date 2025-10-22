import React, { useState, useEffect } from "react";
import {
  Send,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Coins,
  Shield,
  Zap,
  TrendingUp,
  X,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import constants from "../../constants";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [socialMediaAccounts, setSocialMediaAccounts] = useState([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(true);
  const [openModal, setOpenModal] = useState(null);

  // Load social media accounts from backend
  useEffect(() => {
    const loadSocialMediaAccounts = async () => {
      try {
        setIsLoadingSocial(true);
        console.log("🔍 Loading social media accounts from backend...");

        const response = await axios.get(
          `${constants.backend_url}/items/social_media_accounts`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("✅ Social media accounts loaded:", response.data);

        if (response.data?.data) {
          setSocialMediaAccounts(response.data.data);
        }
      } catch (error) {
        console.error("❌ Error loading social media accounts:", error);
        // Keep default social links as fallback
        setSocialMediaAccounts([]);
      } finally {
        setIsLoadingSocial(false);
      }
    };

    loadSocialMediaAccounts();
  }, []);

  // Subscription mutation
  const subscriptionMutation = useMutation({
    mutationFn: async (email) => {
      const response = await fetch(
        `${constants.backend_url}/items/email_subscribers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      // Check if response is successful (including 204)
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to subscribe");
      }

      // Handle empty response for 204 status
      if (response.status === 204) {
        return { success: true };
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSubscribed(true);
      setSubscriptionError(null);
      setEmail("");
    },
    onError: (error) => {
      console.error("Footer subscription error:", error);
      setSubscriptionError("Failed to subscribe. Please try again.");
    },
  });

  const handleSubscription = (e) => {
    e.preventDefault();
    if (!email) {
      setSubscriptionError("Please enter your email address");
      return;
    }
    setSubscriptionError(null);
    subscriptionMutation.mutate(email);
  };

  const quickLinks = [
    { name: "Create Token", href: "/create-coin", icon: <Coins size={16} /> },
    { name: "NFT Minting", href: "/nft-minting", icon: <Shield size={16} /> },
    { name: "NFT Staking", href: "/nft-staking", icon: <Zap size={16} /> },
  ];

  const supportLinks = [
    { name: "Contact Us", href: "/contact" },
    { name: "Purpose", href: "/purpose" },
    { name: "How We Do It", href: "/how-we-do-it" },
    { name: "Noot Token", href: "/noot-token" },
  ];

  const legalLinks = [
    {
      name: "Legal Disclaimer",
      onClick: () => setOpenModal("disclaimer"),
    },
    {
      name: "Privacy Policy",
      onClick: () => setOpenModal("privacy"),
    },
    {
      name: "Terms & Conditions",
      onClick: () => setOpenModal("terms"),
    },
    {
      name: constants.legal.generalStatement.title,
      href: constants.legal.generalStatement.path,
    },
    {
      name: constants.legal.legalAdvice.title,
      href: constants.legal.legalAdvice.path,
    },
  ];

  const socialLinks = [
    {
      name: "Twitter",
      href: "https://x.com/NOOTMEMETOOLS?t=FMwukleX9B5jtIDR4QIquw&s=09",
      icon: (
        <svg
          className="w-5 h-5 text-gray-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/noottools/profilecard/?igsh=b2p3bnlrOThhbHp3",
      icon: (
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
          <path
            d="M19.5 0H6.5C2.86 0 0 2.86 0 6.5V19.5C0 23.14 2.86 26 6.5 26H19.5C23.14 26 26 23.14 26 19.5V6.5C26 2.86 23.14 0 19.5 0ZM23.4 19.5C23.4 21.71 21.71 23.4 19.5 23.4H6.5C4.29 23.4 2.6 21.71 2.6 19.5V6.5C2.6 4.29 4.29 2.6 6.5 2.6H19.5C21.71 2.6 23.4 4.29 23.4 6.5V19.5Z"
            fill="url(#paint0_linear_ig)"
          />
          <path
            d="M13 6.5C9.36 6.5 6.5 9.36 6.5 13C6.5 16.64 9.36 19.5 13 19.5C16.64 19.5 19.5 16.64 19.5 13C19.5 9.36 16.64 6.5 13 6.5ZM13 16.9C10.79 16.9 9.1 15.21 9.1 13C9.1 10.79 10.79 9.1 13 9.1C15.21 9.1 16.9 10.79 16.9 13C16.9 15.21 15.21 16.9 13 16.9Z"
            fill="url(#paint1_linear_ig)"
          />
          <circle cx="19.5" cy="6.5" r="1.3" fill="url(#paint2_linear_ig)" />
          <defs>
            <linearGradient
              id="paint0_linear_ig"
              x1="0"
              y1="13"
              x2="26"
              y2="13"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6B72FF" />
              <stop offset="1" stopColor="#4C91FF" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_ig"
              x1="6.5"
              y1="13"
              x2="19.5"
              y2="13"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6B72FF" />
              <stop offset="1" stopColor="#4C91FF" />
            </linearGradient>
            <linearGradient
              id="paint2_linear_ig"
              x1="18.2"
              y1="6.5"
              x2="20.8"
              y2="6.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6B72FF" />
              <stop offset="1" stopColor="#4C91FF" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@noottools?_t=ZN-8z2S5QZgaqE&_r=1",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-400"
        >
          <path
            d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    {
      name: "Telegram",
      href: "https://t.me/+KJaADxosMeI1MjNk",
      icon: (
        <svg width="24" height="22" viewBox="0 0 26 22" fill="none">
          <path
            d="M10.2022 14.4995L9.77209 20.6418C10.3874 20.6418 10.6539 20.3734 10.9735 20.0511L13.8585 17.2517L19.8365 21.6967C20.9329 22.3171 21.7053 21.9904 22.0011 20.6726L25.925 2.00354C26.2738 0.356844 25.34 -0.286652 24.2718 0.117045L1.20705 9.0831C-0.367066 9.7035 -0.343232 10.5945 0.939465 10.9982L6.83619 12.8605L20.5331 4.15842C21.1777 3.72503 21.7638 3.96483 21.2817 4.39822L10.2022 14.4995Z"
            fill="url(#paint0_linear_tg)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_tg"
              x1="0"
              y1="11"
              x2="26"
              y2="11"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6B72FF" />
              <stop offset="1" stopColor="#4C91FF" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
  ];

  // Use dynamic social media accounts if available, otherwise fallback to static
  const displaySocialLinks =
    !isLoadingSocial && socialMediaAccounts.length > 0
      ? socialMediaAccounts
      : socialLinks;

  // Modal Component
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-gradient-to-br from-[#192630] to-[#1a2332] border border-gray-700 rounded-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Legal Documents Content
  const DisclaimerContent = () => (
    <div className="text-gray-300 space-y-6">
      <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4 mb-6">
        <p className="text-orange-300 font-semibold">
          Effective Date: September 8, 2025
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          1. General Disclaimer
        </h3>
        <p>
          Noottools Wallet ("the App") is provided by NOOTTOOLS, S.L.
          ("Noottools") as a <strong>non-custodial</strong> wallet that allows
          you to manage your own digital assets and connect to decentralized
          applications ("dApps").
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          2. No Custody of Funds
        </h3>
        <p>
          Noottools does not have access to your private keys, seed phrases, or
          funds. All transactions are signed locally on your device and sent
          directly to the blockchain.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          3. Use of Third-Party APIs and dApps
        </h3>
        <p className="mb-3">
          The App integrates with <strong>third-party APIs</strong> and{" "}
          <strong>dApps</strong> to provide services such as token swaps and NFT
          management. You acknowledge that:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Noottools does not control these external services.</li>
          <li>
            Any transaction executed using third-party APIs is done at your own
            risk.
          </li>
          <li>
            Noottools is not responsible for losses, delays, or issues caused by
            third-party providers.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          4. No Investment or Financial Advice
        </h3>
        <p>
          The App does not offer financial, investment, or tax advice. Any
          decision to buy, sell, swap, or hold digital assets is made at your
          own discretion and risk.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          5. Risks Associated with Digital Assets
        </h3>
        <p className="mb-3">
          By using the App, you acknowledge the following risks:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Digital assets and NFTs are highly volatile and may lose value.
          </li>
          <li>
            Transactions on blockchain networks are{" "}
            <strong>irreversible</strong>.
          </li>
          <li>
            Smart contracts and third-party protocols may contain bugs,
            vulnerabilities, or exploits.
          </li>
          <li>
            Noottools is not liable for damages resulting from such risks.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          6. Regulatory Compliance
        </h3>
        <p>
          Noottools complies with the European Union's{" "}
          <strong>MiCA Regulation</strong>. The App does not act as an exchange,
          broker, or custodian and does not promise returns or guarantees on
          digital assets.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          7. Acceptance of Risk
        </h3>
        <p>
          By using the App, you confirm that you understand and accept all
          associated risks, and that Noottools shall not be liable for any loss
          of funds, damages, or adverse consequences resulting from your use of
          the App.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">8. Contact</h3>
        <p className="mb-2">
          If you have questions about this Disclaimer, please contact us:
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="font-semibold text-white">NOOTTOOLS, S.L.</p>
          <p>📧 Email: noot@noottools.io</p>
          <p>🌐 Website: https://noottools.io</p>
        </div>
      </div>
    </div>
  );

  const PrivacyPolicyContent = () => (
    <div className="text-gray-300 space-y-6">
      <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4 mb-6">
        <p className="text-orange-300 font-semibold">
          Effective Date: September 8, 2025
        </p>
      </div>

      <p>
        NOOTTOOLS, S.L. ("Noottools", "we", "our") is committed to protecting
        your privacy. This Privacy Policy explains what data we collect, how we
        use it, and your rights as a user of Noottools Wallet ("the App").
      </p>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          1. Data Controller
        </h3>
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-1">
          <p>
            <strong>Company:</strong> NOOTTOOLS, S.L.
          </p>
          <p>
            <strong>CIF:</strong> B22808646
          </p>
          <p>
            <strong>Registered Address:</strong> CALLE CAMPO SAGRADO NÚMERO 11,
            4º D, Gijón, Asturias, Spain
          </p>
          <p>
            <strong>Contact Email:</strong> noot@noottools.io
          </p>
          <p>
            <strong>Official Website:</strong> https://noottools.io
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          2. Information We Collect
        </h3>
        <p className="mb-3">
          Noottools Wallet is designed to minimize data collection. We collect
          and process the following information:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Email Address</strong> — Collected when you register. Used
            to create your account and recover access if needed.
          </li>
          <li>
            <strong>Local Wallet Data</strong> — Your public addresses, private
            keys, and digital assets remain stored locally on your device.
            Noottools does not collect or store this information.
          </li>
          <li>
            <strong>Anonymous Technical Logs</strong> — Limited technical
            information (e.g., crash reports) may be collected to improve
            performance and stability.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          3. How We Use Your Information
        </h3>
        <p className="mb-3">We only use your email address for:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Creating and managing your account.</li>
          <li>Sending important security or service-related notifications.</li>
          <li>Providing updates about the App.</li>
        </ul>
        <p className="mt-3">
          Noottools does not sell, rent, or share your personal information with
          third parties without your consent.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          4. Private Keys and Fund Control
        </h3>
        <p className="mb-3">Noottools Wallet is a non-custodial wallet:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>We do not have access to your private keys or seed phrases.</li>
          <li>We do not manage, store, or control your funds.</li>
          <li>
            All transactions are signed locally on your device and broadcast
            directly to the Solana blockchain.
          </li>
        </ul>
        <p className="mt-3">
          You are solely responsible for safeguarding your private keys and
          managing your funds.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          5. dApp Integrations and Third Parties
        </h3>
        <p className="mb-3">
          The App allows you to connect to decentralized applications (dApps).
          When interacting with third-party dApps:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Noottools does not control or monitor their privacy practices.
          </li>
          <li>
            You should review the privacy policies and terms of any dApp before
            interacting with it.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          6. Legal Basis for Processing
        </h3>
        <p className="mb-3">We process your personal data based on:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Performance of a contract</strong> — To provide you with
            wallet functionalities.
          </li>
          <li>
            <strong>Compliance with legal obligations</strong> — GDPR and
            applicable regulations.
          </li>
          <li>
            <strong>Your explicit consent</strong> — When you register and agree
            to this Privacy Policy.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">7. Data Retention</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Email addresses are retained as long as your account remains active.
          </li>
          <li>Wallet data (keys, tokens, NFTs) never leave your device.</li>
          <li>
            Upon account deletion, your email address will be permanently
            removed from our systems.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          8. International Data Transfers
        </h3>
        <p>
          Noottools does not transfer your personal data outside the European
          Economic Area (EEA). If such transfers become necessary in the future,
          we will ensure compliance with EU Standard Contractual Clauses.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">9. Data Security</h3>
        <p className="mb-3">
          We implement technical and organizational measures to protect your
          personal data:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Local encryption of sensitive data.</li>
          <li>Secure HTTPS communications.</li>
          <li>No storage of private keys or seed phrases on our servers.</li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          10. Your Rights (GDPR)
        </h3>
        <p className="mb-3">You have the following rights under the GDPR:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Access</strong> — Request details of the personal data we
            hold about you.
          </li>
          <li>
            <strong>Rectification</strong> — Correct inaccurate or incomplete
            data.
          </li>
          <li>
            <strong>Erasure</strong> — Request deletion of your personal data.
          </li>
          <li>
            <strong>Portability</strong> — Obtain a copy of your data in a
            structured format.
          </li>
          <li>
            <strong>Restriction and Objection</strong> — Limit or object to the
            processing of your data.
          </li>
        </ul>
        <p className="mt-3">
          To exercise your rights, contact us at noot@noottools.io.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          11. Disclaimer and Limitation of Liability
        </h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Noottools is not responsible for any losses resulting from misuse of
            the App, user error, bugs in third-party dApps, or market
            volatility.
          </li>
          <li>Blockchain transactions are irreversible.</li>
          <li>
            You are solely responsible for securing your private keys and
            verifying transaction details.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          12. Changes to this Privacy Policy
        </h3>
        <p className="mb-3">
          We may update this Privacy Policy to reflect regulatory or functional
          changes. If significant updates are made, we will notify you via:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>An in-app notification.</li>
          <li>Email, when applicable.</li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">13. Contact</h3>
        <p className="mb-2">
          If you have any questions regarding this Privacy Policy, you can
          contact us at:
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="font-semibold text-white">NOOTTOOLS, S.L.</p>
          <p>📧 Email: noot@noottools.io</p>
          <p>🌐 Website: https://noottools.io</p>
        </div>
      </div>
    </div>
  );

  const TermsConditionsContent = () => (
    <div className="text-gray-300 space-y-6">
      <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-4 mb-6">
        <p className="text-orange-300 font-semibold">
          Effective Date: September 8, 2025
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">1. Introduction</h3>
        <p>
          Welcome to Noottools Wallet ("the App"), provided by NOOTTOOLS, S.L.
          ("Noottools", "we", "our"). By using the App, you agree to these Terms
          and Conditions. If you do not agree, you must not use the App.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          2. Non-Custodial Wallet
        </h3>
        <p className="mb-3">
          Noottools Wallet is a <strong>non-custodial</strong> cryptocurrency
          wallet:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>You control your private keys and funds at all times.</li>
          <li>
            Noottools does not store, manage, or have access to your digital
            assets.
          </li>
          <li>
            All transactions are signed locally on your device and broadcast
            directly to the Solana blockchain.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          3. Use of APIs and Third-Party Services
        </h3>
        <p className="mb-3">
          The App integrates with <strong>third-party APIs</strong> (e.g.,
          decentralized exchanges such as Raydium or Jupiter) to enable token
          swaps and other functionalities. You acknowledge and agree that:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Noottools does not operate, control, or guarantee the accuracy,
            security, or reliability of these services.
          </li>
          <li>
            Any transactions executed through these APIs are your sole
            responsibility.
          </li>
          <li>
            Noottools is not liable for any loss or damage resulting from
            third-party APIs.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          4. No Financial Advice
        </h3>
        <p>
          Noottools does not provide financial, investment, or tax advice. All
          actions performed within the App, including token swaps and dApp
          integrations, are initiated at your own risk.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          5. Risk Acknowledgment
        </h3>
        <p className="mb-3">You understand and agree that:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Cryptocurrencies, NFTs, and digital assets are highly volatile.
          </li>
          <li>
            Blockchain transactions are <strong>irreversible</strong>.
          </li>
          <li>
            You assume full responsibility for all transactions signed via the
            App.
          </li>
          <li>
            Noottools is not responsible for lost private keys, forgotten seed
            phrases, or unauthorized access.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          6. Compliance with Regulations
        </h3>
        <p>
          Noottools Wallet complies with applicable EU regulations, including{" "}
          <strong>MiCA</strong> and <strong>GDPR</strong>. The App does not act
          as a custodian, broker, exchange, or investment platform.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          7. Limitation of Liability
        </h3>
        <p className="mb-3">To the maximum extent permitted by law:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Noottools shall not be liable for any direct, indirect, incidental,
            or consequential damages arising from the use of the App.
          </li>
          <li>
            Your sole remedy for dissatisfaction with the App is to stop using
            it.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">
          8. Changes to These Terms
        </h3>
        <p>
          We may update these Terms to reflect regulatory or functional changes.
          If significant changes occur, we will notify you via the App or by
          email.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-3">9. Contact</h3>
        <p className="mb-2">
          For any questions regarding these Terms, please contact us:
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="font-semibold text-white">NOOTTOOLS, S.L.</p>
          <p>📧 Email: noot@noottools.io</p>
          <p>🌐 Website: https://noottools.io</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Warning Banner */}
      <div className="w-full bg-gradient-to-br from-[#192630] to-[#1a2332] border-t border-white/20 border-b border-white/20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg text-center font-semibold text-gray-200 mb-3">
                Important Disclaimer
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                All content available on our website, on hyperlinked websites,
                and on applications, forums, blogs, social media accounts and
                other platforms associated with <strong>Noottools</strong> is
                intended solely to provide you with general information. We make
                no warranties of any kind with respect to our content,
                including, but not limited to, the accuracy and currency of the
                information. None of the content we provide should be construed
                as financial, legal or any other type of advice on which you may
                specifically rely for any purpose. Any use or reliance you place
                on our content is solely at your own risk. What you should do is
                conduct your own research, review and analysis, and verify our
                content before relying on it. Trading is a high-risk activity
                that can result in significant losses, so you should consult
                with your financial advisor before making any decisions. Nothing
                on our Site should be considered an invitation or offer to take
                any action.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gradient-to-br from-[#192630] to-[#1a2332] border-t border-gray-700">
        {/* Main Footer Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-5 md:grid-cols-2 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img
                  src="/pengu.png"
                  alt="Noottools Logo"
                  className="w-12 h-12 rounded-lg"
                />
                <h3 className="text-2xl font-bold text-white">Noottools</h3>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                The ultimate Web3 platform for creating, launching, and scaling
                blockchain projects. Build the future of decentralized
                applications with our comprehensive toolkit.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail size={16} />
                  <span>noot@noottools.io</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Phone size={16} />
                  <span>24/7 Community Support</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <MapPin size={16} />
                  <span>Global • Remote First</span>
                </div>
              </div>
            </div>

            {/* Platform, Support and Legal - Mobile'da yan yana */}
            <div className="lg:col-span-3 md:col-span-2 grid grid-cols-3 gap-8">
              {/* Quick Links */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-6">
                  Platform
                </h4>
                <div className="space-y-3">
                  {quickLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors duration-300 group"
                    >
                      <span className="text-purple-400 group-hover:text-purple-300 transition-colors">
                        {link.icon}
                      </span>
                      {link.name}
                    </a>
                  ))}
                </div>
              </div>

              {/* Support Links */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-6">
                  Support
                </h4>
                <div className="space-y-3">
                  {supportLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="block text-gray-400 hover:text-white transition-colors duration-300"
                    >
                      {link.name}
                    </a>
                  ))}
                </div>
              </div>

              {/* Legal Links */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-6">Legal</h4>
                <div className="space-y-3">
                  {legalLinks.map((link, index) =>
                    link.href ? (
                      <a
                        key={index}
                        href={link.href}
                        className="block text-gray-400 hover:text-white transition-colors duration-300"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <button
                        key={index}
                        onClick={link.onClick}
                        className="block text-gray-400 hover:text-white transition-colors duration-300 text-left"
                      >
                        {link.name}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-6">
                Stay Updated
              </h4>
              <p className="text-gray-400 mb-6">
                Subscribe to our newsletter for the latest updates and exclusive
                insights.
              </p>

              {!isSubscribed ? (
                <div className="space-y-4">
                  <form onSubmit={handleSubscription} className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      disabled={subscriptionMutation.isPending}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {subscriptionMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Send size={16} />
                          Subscribe
                        </>
                      )}
                    </button>
                  </form>

                  {/* Error Message */}
                  {subscriptionError && (
                    <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2 text-red-400">
                      <AlertCircle size={16} />
                      <span className="text-sm">{subscriptionError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 text-center">
                  <CheckCircle
                    className="text-green-400 mx-auto mb-2"
                    size={24}
                  />
                  <p className="text-green-300 text-sm font-medium">
                    🎉 Successfully subscribed!
                  </p>
                  <p className="text-green-400 text-xs mt-1">
                    Thank you for joining our community
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 bg-gray-900/50">
          <div className="container mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {/* Copyright */}
              <div className="text-gray-400 text-sm">
                © 2024 Noottools. All rights reserved. Built with ❤️ for the
                Web3 community.
              </div>

              {/* Social Links */}
              <div className="flex space-x-4">
                {displaySocialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url || social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                    title={social.platform_name || social.name}
                  >
                    <div className="bg-gradient-to-r from-indigo-500/20 to-blue-500/20 hover:from-indigo-500/30 hover:to-blue-500/30 rounded-xl p-3 w-12 h-12 flex items-center justify-center transition-all duration-300 transform hover:scale-110">
                      {social.icon_code ? (
                        <i
                          className={`${social.icon_code} text-gray-400 text-lg`}
                        ></i>
                      ) : (
                        social.icon
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <Modal
        isOpen={openModal === "disclaimer"}
        onClose={() => setOpenModal(null)}
        title="Crypto Legal Disclaimer — Noottools Wallet"
      >
        <DisclaimerContent />
      </Modal>

      <Modal
        isOpen={openModal === "privacy"}
        onClose={() => setOpenModal(null)}
        title="Privacy Policy — Noottools Wallet"
      >
        <PrivacyPolicyContent />
      </Modal>

      <Modal
        isOpen={openModal === "terms"}
        onClose={() => setOpenModal(null)}
        title="Terms and Conditions — Noottools Wallet"
      >
        <TermsConditionsContent />
      </Modal>
    </>
  );
};

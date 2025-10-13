import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Twitter,
  Github,
  Linkedin,
  Instagram,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import constants from "../constants";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: "general",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [contactError, setContactError] = useState(null);
  const [socialMediaAccounts, setSocialMediaAccounts] = useState([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(true);

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

  const contactInfo = [
    {
      icon: <Mail className="text-blue-400" size={24} />,
      title: "Email Us",
      info: "noot@noottools.io",
      subInfo: "noot@noottools.io",
      description: "Get in touch with our team",
    },
    {
      icon: <MessageCircle className="text-green-400" size={24} />,
      title: "Live Chat",
      info: "24/7 Support",
      subInfo: "Average response: 2 minutes",
      description: "Chat with our support team",
    },
    {
      icon: <Clock className="text-purple-400" size={24} />,
      title: "Office Hours",
      info: "Mon - Fri: 9:00 - 18:00",
      subInfo: "UTC+0 Timezone",
      description: "When we're available",
    },
    {
      icon: <MapPin className="text-orange-400" size={24} />,
      title: "Location",
      info: "Global Team",
      subInfo: "Remote-first company",
      description: "We're everywhere",
    },
  ];

  const socialLinks = [
    {
      icon: <Twitter className="text-blue-400" size={24} />,
      name: "Twitter",
      url: "https://x.com/NOOTMEMETOOLS?t=FMwukleX9B5jtIDR4QIquw&s=09",
    },
    {
      icon: <Instagram className="text-pink-400" size={24} />,
      name: "Instagram",
      url: "https://www.instagram.com/noottools/profilecard/?igsh=b2p3bnlrOThhbHp3",
    },
    {
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
      name: "TikTok",
      url: "https://www.tiktok.com/@noottools?_t=ZN-8z2S5QZgaqE&_r=1",
    },
    {
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="text-blue-500"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
            fill="currentColor"
          />
        </svg>
      ),
      name: "Telegram",
      url: "https://t.me/+KJaADxosMeI1MjNk",
    },
  ];

  // Use dynamic social media accounts if available, otherwise fallback to static
  const displaySocialLinks =
    !isLoadingSocial && socialMediaAccounts.length > 0
      ? socialMediaAccounts
      : socialLinks;

  // Contact form mutation
  const contactMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(
        `${constants.backend_url}/items/contact_requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      // Check if response is successful (including 204)
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to send message");
      }

      // Handle empty response for 204 status
      if (response.status === 204) {
        return { success: true };
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      setContactError(null);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        type: "general",
      });
    },
    onError: (error) => {
      console.error("Contact form error:", error);
      setContactError("Failed to send message. Please try again later.");
    },
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !formData.subject ||
      !formData.message
    ) {
      setContactError("Please fill in all required fields");
      return;
    }
    setContactError(null);
    contactMutation.mutate(formData);
  };

  const faqItems = [
    {
      question: "How do I create my first token?",
      answer:
        "Simply connect your wallet, fill out the token creation form, and deploy to the Solana blockchain. Our intuitive interface guides you through every step.",
    },
    {
      question: "What are the fees for token creation?",
      answer:
        "Token creation fees start at 0.05 SOL, which includes deployment costs and platform fees. Additional features like liquidity pools may have separate costs.",
    },
    {
      question: "How secure is the platform?",
      answer:
        "We use enterprise-grade security with multi-layer encryption, smart contract audits, and regular security updates. Your assets are protected by industry-leading security measures.",
    },
    {
      question: "Can I get a refund?",
      answer:
        "Due to the nature of blockchain transactions, most fees are non-refundable. However, we offer full support to ensure your project succeeds.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A151E] pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-green-600/20 border border-blue-500/30 rounded-2xl px-6 py-3 mb-6">
            <Phone className="text-blue-400" size={24} />
            <span className="text-blue-300 font-semibold">Get In Touch</span>
          </div>

          <h1 className="text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              Contact
            </span>
            <br />
            <span className="text-white">Our Team</span>
          </h1>

          <p className="text-gray-400 text-xl max-w-4xl mx-auto leading-relaxed">
            Have questions about our platform? Need support with your project?
            We're here to help you succeed in the Web3 space.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {contactInfo.map((info, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 bg-gray-800/50 rounded-xl mx-auto mb-4 flex items-center justify-center">
                {info.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {info.title}
              </h3>
              <div className="text-gray-300 font-medium mb-1">{info.info}</div>
              <div className="text-gray-400 text-sm mb-2">{info.subInfo}</div>
              <p className="text-gray-500 text-sm">{info.description}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          {/* Contact Form */}
          <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6">
              Send us a Message
            </h2>

            {!isSubmitted ? (
              <div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-300 mb-2">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="What's this about?"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows="6"
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {contactMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Send Message
                      </>
                    )}
                  </button>
                </form>

                {/* Error Message */}
                {contactError && (
                  <div className="mt-4 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400">
                    <AlertCircle size={20} />
                    <span className="font-medium">{contactError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-green-400" size={40} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Message Sent Successfully!
                </h3>
                <p className="text-gray-400 mb-6">
                  Thank you for reaching out. We'll get back to you within 24
                  hours.
                </p>
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 font-medium mb-6">
                  🎉 Your message has been received and we'll respond soon!
                </div>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            )}
          </div>

          {/* Social Links & FAQ */}
          <div className="space-y-8">
            {/* Social Links */}
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-6">
                Connect With Us
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {displaySocialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    {social.icon_code ? (
                      <i
                        className={`${social.icon_code} text-gray-400 text-xl`}
                      ></i>
                    ) : (
                      social.icon
                    )}
                    <span className="text-gray-300 font-medium">
                      {social.platform_name || social.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick FAQ */}
            <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-6">Quick FAQ</h3>
              <div className="space-y-4">
                {faqItems.map((faq, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-700 pb-4 last:border-b-0 last:pb-0"
                  >
                    <h4 className="text-lg font-semibold text-white mb-2">
                      {faq.question}
                    </h4>
                    <p className="text-gray-400 text-sm">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

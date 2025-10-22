import React from "react";
import { Menu, User } from "lucide-react";
import { Link } from "react-router-dom"; // Bu satırı ekleyin
import WalletLogin from "../Walletlogin";

export const Header = ({ isHeroInView, onSidebarToggle }) => {
  return (
    <header
      className={`transition-all duration-300 ${
        isHeroInView ? "bg-transparent" : "bg-transparent "
      } p-4`}
    >
      <div className="container mx-auto px-4 bg-[#192630] rounded-2xl py-4 flex justify-between items-center">
        {/* Sol taraf - Sidebar butonu, fotoğraf ve uygulama adı */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Sidebar toggle butonu */}
          <button
            onClick={onSidebarToggle}
            className="text-white hover:text-blue-400 transition-colors"
          >
            <div className="items-center flex justify-center bg-[#243340] p-2 sm:p-3 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="13"
                viewBox="0 0 18 15"
                fill="none"
                className="sm:w-[18px] sm:h-[15px]"
              >
                <path
                  d="M0 1.5C0 0.67158 0.671574 0 1.5 0H16.5C17.3284 0 18 0.67158 18 1.5C18 2.32842 17.3284 3 16.5 3H1.5C0.671572 3 0 2.32842 0 1.5Z"
                  fill="#91A8B9"
                />
                <path
                  d="M0 7.5C0 6.67158 0.671574 6 1.5 6H10.5C11.3284 6 12 6.67158 12 7.5C12 8.32842 11.3284 9 10.5 9H1.5C0.671572 9 0 8.32842 0 7.5Z"
                  fill="#91A8B9"
                />
                <path
                  d="M0 13.5C0 12.6716 0.671574 12 1.5 12H16.5C17.3284 12 18 12.6716 18 13.5C18 14.3284 17.3284 15 16.5 15H1.5C0.671572 15 0 14.3284 0 13.5Z"
                  fill="#91A8B9"
                />
              </svg>
            </div>
          </button>

          {/* Uygulama adı */}
          <Link
            to="/"
            className="flex items-center space-x-1 sm:space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img
              src="/pengu.png"
              alt=" Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12"
            />
            <h1 className="text-white text-lg sm:text-xl lg:text-xl font-bold"></h1>
          </Link>
        </div>

        {/* Sağ taraf - Mavi buton */}
        <div>
          <WalletLogin />
        </div>
      </div>
    </header>
  );
};

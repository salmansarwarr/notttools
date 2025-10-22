import { Routes, Route } from "react-router-dom";
import Notfound from "./pages/Notfound";

import { useGlobalState } from "./hooks/useGlobalState";
import Loading from "./components/Loading";

import Landing from "./pages/Landing";
import LandingLayout from "./components/landing/layout";
import CreateCoin from "./pages/CreateCoin";
import Projects from "./pages/Projects";
import SingleProject from "./pages/SingleProject";
import BoostToken from "./pages/BoostToken";
import AddLiquidity from "./pages/AddLiquidity";
import NftMinting from "./pages/NftMinting";
import NftStaking from "./pages/NftStaking";
import NootToken from "./pages/NootToken";
import Wallet from "./pages/Wallet";
import Contact from "./pages/Contact";
import Purpose from "./pages/Purpose";
import HowWeDoIt from "./pages/HowWeDoIt";
import Nfts from "./pages/Nfts";
import GeneralStatement from "./pages/GeneralStatement";
import LegalAdvice from "./pages/LegalAdvice";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminWithdraw from "./pages/AdminWithdraw";
import Detox from "./pages/Detox";
import CreatePool from "./pages/CreatePool";
import TokenDetail from "./pages/Tokenetail";
import TokensPage from "./pages/Tokens";

const AppRoutes = () => {
  const { globalState } = useGlobalState();

  if (!globalState) {
    return <Loading />;
  }
  return (
    <Routes>
      <Route path="/" element={<LandingLayout />}>
        <Route index element={<Landing />} />
        <Route path="/create-coin" element={<CreateCoin />} />
        <Route path="create-pool" element={<CreatePool/>} />
        <Route path="/tokens" element={<TokensPage />} />
        <Route path="/token/:mintAddress" element={<TokenDetail />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:id" element={<SingleProject />} />
        <Route path="/boost" element={<BoostToken />} />
        <Route path="/add-liquidity" element={<AddLiquidity />} />
        <Route path="/nft-minting" element={<NftMinting />} />
        <Route path="/nft-staking" element={<NftStaking />} />
        <Route path="/noot-token" element={<NootToken />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/purpose" element={<Purpose />} />
        <Route path="/how-we-do-it" element={<HowWeDoIt />} />
        <Route path="/nfts" element={<Nfts />} />
        <Route path="/general-statement" element={<GeneralStatement />} />
        <Route path="/legal-advice" element={<LegalAdvice />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/admin/withdraw" element={<AdminWithdraw />} />
        <Route path="/detox" element={<Detox />} />
      </Route>

      <Route path="*" element={<Notfound />} />
    </Routes>
  );
};

export default AppRoutes;

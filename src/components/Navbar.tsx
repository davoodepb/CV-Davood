import { FileText, ShoppingBag, MessageCircle } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

const navItems = [
  { name: "My CV", url: "/", icon: FileText },
  { name: "Shop", url: "/shop", icon: ShoppingBag },
  { name: "Chat", url: "/chat", icon: MessageCircle },
];

const Navbar = () => {
  return <NavBar items={navItems} />;
};

export default Navbar;

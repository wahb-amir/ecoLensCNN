"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, Menu, X } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <nav className="fixed z-50 top-0 left-0 border-b border-gray-300 w-full h-auto bg-white">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href={'/'}>
        <div className="flex items-center gap-2 text-green-600">
          <Leaf className="w-8 h-8" />
          <span className="text-xl sm:text-[28px] font-semibold">
            EcoTracker
          </span>
        </div>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden lg:flex items-center gap-6 text-gray-700 font-medium">
          <Link href={"/"}>
            <li className="hover:bg-green-600 hover:text-white px-4 py-1 cursor-pointer transition
            rounded-[3px]">
              Home
            </li>
          </Link>
          <Link href={"/"}>
            <li className="hover:bg-green-600 hover:text-white px-4 py-1 cursor-pointer transition
            rounded-[3px]">
              About
            </li>
          </Link>{" "}
          <Link href={"/"}>
            <li className="hover:bg-green-600 hover:text-white px-4 py-1 cursor-pointer transition
            rounded-[3px]">
              Tracker
            </li>
          </Link>
          <Link href={"/"}>
            <li className="hover:bg-green-600 hover:text-white px-4 py-1 cursor-pointer transition
            rounded-[3px]">
              Insight
            </li>
          </Link>{" "}
        </ul>

        {/* Login Button */}
        <button onClick={()=>{router.push("/auth")}}
          className="hidden lg:flex px-8 py-2 border border-green-600 bg-transparent font-medium
        text-gray-700 rounded-[3px] hover:text-white hover:bg-green-600 cursor-pointer transition-all
        duration-200
        "
        >
          Login
        </button>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden text-gray-700"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <>
          <ul className="lg:hidden flex flex-col items-center justify-center gap-4 px-6 pb-4 text-gray-700 font-medium 
          border-b border-gray-300">
            <Link href={'/'}>
            <li className="active:bg-green-600 active:text-white px-4 py-1 cursor-pointer 
            rounded-[3px] transition">
              Home
            </li>
            </Link>
            <Link href={'/'}>
            <li className="active:bg-green-600 active:text-white px-4 py-1 cursor-pointer 
            rounded-[3px] transition">
              About
            </li>
            </Link>
            <Link href={'/'}>
            <li className="active:bg-green-600 active:text-white px-4 py-1 cursor-pointer 
            rounded-[3px] transition">
              Tracker
            </li>
            </Link>
             <Link href={'/'}>
            <li className="active:bg-green-600 active:text-white px-4 py-1 cursor-pointer 
            rounded-[3px] transition">
              Insight
            </li>
            </Link>
            <li>
            {/* For Login Button */}
          <button onClick={()=>{router.push("/auth")}}
        className="lg:flex px-8 py-2 border border-green-600 bg-transparent font-medium
        text-gray-700 rounded-[3px] active:text-white active:bg-green-600 cursor-pointer 
        transition-all duration-200 block m-auto
        ">
            Login
          </button>
            </li>
          </ul>
        </>
      )}
    </nav>
  );
};

export default Navbar;

import React from "react";
import { Leaf } from "lucide-react";
import Navbar from "./Navbar";

const Hero = () => {
  return (
    <>
    <section className="sm:mt-20 bg-gradient-to-b from-green-50 to-white flex flex-col justify-center items-center min-h-screen text-center px-4">
      <div className="max-w-3xl">
        <Leaf className="w-14 h-14 text-green-600 mx-auto mb-4 animate-bounce" />
        <h1 className="font-extrabold text-[28px] sm:text-[48px] lg:text-[56px] text-gray-900 leading-tight">
          Track Your Impact,{" "}
          <span className="text-green-600">Live a Greener Tomorrow.</span>
        </h1>
        <p className="mt-4 text-gray-700 text-base sm:text-lg">
          EcoTracker helps you monitor, reduce, and celebrate your eco-friendly actions. 
          Make sustainability a habit, one step at a time.
        </p>

        <div className="mt-6 flex flex-row gap-4 justify-center">
          <button className="cursor-pointer bg-green-600 text-white px-6 py-3 rounded-md font-medium hover:bg-green-700 transition">
            Get Started
          </button>
          <button className="cursor-pointer border border-green-600 text-green-600 px-6 py-3 rounded-md font-medium hover:bg-green-100 transition">
            Learn More
          </button>
        </div>
      </div>
    </section>
    </>
  );
};

export default Hero;

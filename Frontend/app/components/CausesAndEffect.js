"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";


const causes = [
  {
    title: "Air & Water Pollution",
    desc: "Toxic emissions and untreated waste degrade air and water quality.",
    img: "/causesImages/airPollution.jpeg",
    severity: "High",
    stat: "7M+ premature deaths annually linked to pollution",
    insight: "Eco-Tracker monitors pollution indicators and visualizes risk zones.",
  },
  {
    title: "Deforestation",
    desc: "Large-scale tree loss disrupts ecosystems and carbon balance.",
    img: "/causesImages/deforestion.jpeg",
    severity: "Critical",
    stat: "10M hectares of forest lost every year",
    insight: "Our platform tracks deforestation trends using open datasets.",
  },
  {
    title: "Overconsumption",
    desc: "Excessive use of natural resources exceeds Earth’s capacity.",
    img: "/causesImages/overconsumption.jpg",
    severity: "Medium",
    stat: "Humanity uses 1.7× Earth’s resources yearly",
    insight: "Eco-Tracker promotes data-driven sustainable consumption.",
  },
  {
    title: "Plastic Waste",
    desc: "Non-biodegradable plastics pollute land and marine life.",
    img: "/causesImages/plasticwaste.jpg",
    severity: "High",
    stat: "11M tons of plastic enter oceans annually",
    insight: "We analyze waste patterns to support smarter recycling policies.",
  },
];

const effects = [
  {
    title: "Climate Change",
    desc: "Rising global temperatures cause extreme weather patterns.",
    img: "/effectImages/climateChange.jpeg",
    impact: "Global",
    stat: "1.1°C temperature rise since pre-industrial era",
    insight: "Eco-Tracker visualizes climate risk forecasts for awareness.",
  },
  {
    title: "Loss of Biodiversity",
    desc: "Species extinction increases due to habitat destruction.",
    img: "/effectImages/lossBio.jpeg",
    impact: "Ecosystems",
    stat: "1M species at risk of extinction",
    insight: "Our dashboards highlight biodiversity-threat zones.",
  },
  {
    title: "Water Scarcity",
    desc: "Clean water availability decreases worldwide.",
    img: "/effectImages/waterSecarity.jpeg",
    impact: "Human Survival",
    stat: "2B people lack safe drinking water",
    insight: "Eco-Tracker maps water stress regions in real time.",
  },
  {
    title: "Health Issues",
    desc: "Pollution contributes to respiratory and chronic diseases.",
    img: "/effectImages/healthImages.jpeg",
    impact: "Public Health",
    stat: "Air pollution causes 1 in 9 deaths globally",
    insight: "We connect environmental data with health risk awareness.",
  },
];

   {/*REUSABLE CARDS*/}

const CauseCard = ({ item }) => (
  <motion.div
    whileHover={{ y: -6, scale: 1.02 }}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
    className="bg-gradient-to-b from-green-50 to-white rounded-xl shadow-md overflow-hidden"
  >
    <Image
      src={item.img}
      alt={item.title}
      width={300}
      height={300}
      className="h-36 w-full object-cover"
    />

    <div className="p-4 text-center">
      <h4 className="font-semibold text-gray-800">{item.title}</h4>

      <p className="text-sm text-gray-600 mt-1">{item.desc}</p>

      <p className="text-xs text-emerald-600 mt-2 font-medium">
        Severity: {item.severity}
      </p>

      <p className="text-xs text-gray-500 mt-1">{item.stat}</p>

      <p className="text-xs text-gray-400 mt-1 italic">
        {item.insight}
      </p>
    </div>
  </motion.div>
);

const EffectCard = ({ item }) => (
  <motion.div
    whileHover={{ y: -6, scale: 1.02 }}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
    className="bg-white rounded-xl shadow-md overflow-hidden"
  >
    <Image
      src={item.img}
      alt={item.title}
      width={300}
      height={300}
      className="h-36 w-full object-cover"
    />

    <div className="p-4 text-center">
      <h4 className="font-semibold text-gray-800">{item.title}</h4>

      <p className="text-sm text-gray-600 mt-1">{item.desc}</p>

      <p className="text-xs text-red-500 mt-2 font-medium">
        Impact: {item.impact}
      </p>

      <p className="text-xs text-gray-500 mt-1">{item.stat}</p>

      <p className="text-xs text-gray-400 mt-1 italic">
        {item.insight}
      </p>
    </div>
  </motion.div>
);


   {/* MAIN SECTION */}

const CausesAndEffect = () => {
  return (
    <section
      className="bg-gradient-to-b from-green-50 to-white py-16 px-4 overflow-hidden"
      id="causesAndEffects"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-green-600">
            Causes & Effects of Environmental Tension
          </h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            Eco-Tracker identifies the root causes of environmental stress and
            translates complex data into meaningful insights for awareness,
            policy support, and sustainable action.
          </p>
        </motion.div>

        { /* CAUSES */ }
        <div className="mb-20">
          <h3 className="text-[20px] sm:text-2xl font-semibold text-emerald-600 mb-6 flex items-center gap-2">
            🌿 Causes of Environmental Tension
          </h3>

          {/* Mobile Swiper */}
          <div className="md:hidden">
            <Swiper
              modules={[Autoplay, Pagination]}
              autoplay={{ delay: 3000 }}
              pagination={{ clickable: true }}
              spaceBetween={16}
              slidesPerView={1.1}
            >
              {causes.map((item, index) => (
                <SwiperSlide key={index}>
                  <CauseCard item={item} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid grid-cols-4 gap-6">
            {causes.map((item, index) => (
              <CauseCard key={index} item={item} />
            ))}
          </div>
        </div>

        {/* EFFECTS */}
        <div>
          <h3 className="text-[20px] sm:text-2xl font-semibold text-red-500 mb-6 flex items-center gap-2">
            ⚠️ Effects on Our Environment
          </h3>

          {/* Mobile Swiper */}
          <div className="md:hidden">
            <Swiper
              modules={[Autoplay, Pagination]}
              autoplay={{ delay: 3200 }}
              pagination={{ clickable: true }}
              spaceBetween={16}
              slidesPerView={1.1}
            >
              {effects.map((item, index) => (
                <SwiperSlide key={index}>
                  <EffectCard item={item} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid grid-cols-4 gap-6">
            {effects.map((item, index) => (
              <EffectCard key={index} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CausesAndEffect;

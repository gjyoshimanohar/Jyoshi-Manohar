import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import { services } from '../data';

export default function Services() {
 return (
 <section id="services" className="bg-white py-5">
 <div className="w-[98%] mx-auto px-3 sm:px-6">
 <div className="mb-3 lg:mb-4">
 <h2 className="text-4xl lg:text-5xl text-primary leading-tight tracking-tight mb-4">
 Strategic Expertise.
 </h2>
 <p className="text-base lg:text-base text-black font-medium leading-relaxed mb-4 max-w-none">
 Precision-driven solutions for complex regulatory environments. We provide smart tools, efficient systems, and updated processes.
 </p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
 {services.map((service, index) => {
 const IconComponent = (Icons as any)[service.iconName];
 
 return (
 <motion.div
 key={service.id}
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ delay: index * 0.1, duration: 0.5 }}
 >
 <Link
 to={`/services/${service.id}`}
 className="group relative overflow-hidden flex flex-col bg-white p-8 lg:p-10 rounded-3xl h-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200 transition-all duration-500 hover:shadow-[0_12px_40px_rgba(49,80,160,0.25)] hover:-translate-y-2 hover:scale-[1.02]"
 >
 <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
 
 <div className="absolute top-8 right-8 lg:top-10 lg:right-10 opacity-0 transform translate-x-4 -translate-y-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 z-10">
 <Icons.ArrowUpRight className="h-6 w-6 text-secondary" strokeWidth={2.5} />
 </div>

 {IconComponent && (
 <div className="relative z-10 w-fit mb-3">
 <div className="flex items-center justify-center p-3 h-14 w-14 bg-primary/5 rounded-2xl transition-all duration-500 group-hover:bg-primary">
 <IconComponent 
 className="text-primary transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 group-hover:text-white" 
 strokeWidth={1.5} 
 />
 </div>
 </div>
 )}

 <h3 className="relative z-10 text-xl lg:text-2xl font-bold text-primary mb-2 transition-colors duration-500 group-hover:text-secondary">
 {service.title}
 </h3>
 
 <p className="relative z-10 text-base text-black/70 font-medium leading-relaxed text-justify transition-colors duration-500 group-hover:text-black/90">
 {service.description}
 </p>
 </Link>
 </motion.div>
 );
 })}
 </div>
 </div>
 </section>
 );
}

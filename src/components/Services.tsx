import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { services } from '../data';

export default function Services() {
  return (
    <section id="services" className="bg-white">
      <div className="max-w-7xl mx-auto border-x border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-12 lg:p-16 border-b border-border flex flex-col justify-center bg-accent">
            <h2 className="text-4xl font-black text-primary mb-6 leading-none">Strategic Expertise.</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Precision-driven solutions for complex regulatory environments.
            </p>
          </div>
          {services.map((service, index) => {
            const IconComponent = (Icons as any)[service.iconName];
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-10 lg:p-12 border-b border-r border-border bg-white hover:bg-white transition-all duration-300 group flex flex-col relative hover:z-10 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]"
              >
                <div className="flex justify-between items-start mb-8">
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Service 0{index + 1}</span>
                   {IconComponent && <IconComponent className="h-5 w-5 text-slate-300 group-hover:text-secondary transition-colors" />}
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-primary mb-4">{service.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow">
                  {service.description}
                </p>
                <div className="h-[2px] w-8 bg-slate-200 group-hover:w-full group-hover:bg-secondary transition-all"></div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

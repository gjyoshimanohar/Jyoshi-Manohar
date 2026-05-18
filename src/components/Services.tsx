import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import { services } from '../data';

const cardStyles = [
  'bg-blue-100/55', // Light Blue
  'bg-amber-100/55', // Light Yellow
  'bg-green-100/55', // Light Green
  'bg-rose-100/55', // Light Pink
  'bg-purple-100/55', // Light Purple
];

export default function Services() {
  return (
    <section id="services" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 lg:mb-20">
          <h2 className="text-4xl lg:text-5xl font-black text-primary mb-6 leading-tight tracking-tight">
            Strategic Expertise.
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed max-w-2xl text-lg lg:text-xl">
            Precision-driven solutions for complex regulatory environments. We provide smart tools, efficient systems, and updated processes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => {
            const IconComponent = (Icons as any)[service.iconName];
            const bgClass = cardStyles[index % cardStyles.length];
            
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
                  className={`block p-8 lg:p-10 rounded-[2rem] h-full ${bgClass} transition-shadow duration-300 hover:shadow-xl`}
                >
                  {IconComponent && (
                    <IconComponent 
                      className="h-14 w-14 text-[#FF6B4A] mb-8" 
                      strokeWidth={1.2} 
                    />
                  )}
                  <h3 className="text-[1.35rem] font-semibold tracking-tight text-slate-800 mb-4">
                    {service.title}
                  </h3>
                  <p className="text-slate-600 text-[15px] leading-relaxed">
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

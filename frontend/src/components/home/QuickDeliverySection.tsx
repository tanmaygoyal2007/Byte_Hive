import React from "react";
import "./QuickDeliverySection.css";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, ShoppingBag } from "lucide-react";

const QuickDeliverySection: React.FC = () => {
    const navigate = useNavigate();
    
    const orderNow = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        navigate(`/explore`);
    }

    const floatAnimation: any = {
      y: [0, -18, 0],
      rotate: [0, 5, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    };

    const floatAnimationDelayed: any = {
      y: [0, -22, 0],
      rotate: [0, -4, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.8
      }
    };

    const floatAnimationFast: any = {
      y: [0, -12, 0],
      rotate: [0, 8, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 1.2
      }
    };

    const containerVariants: any = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.15,
          delayChildren: 0.1
        }
      }
    };

    const itemVariants: any = {
      hidden: { opacity: 0, x: -30, filter: 'blur(5px)' },
      visible: {
        opacity: 1, x: 0, filter: 'blur(0px)',
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
      }
    };

    return (
        <section className="delivery">
            <div className="delivery-container">
                <motion.div 
                    className="delivery-text"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={containerVariants}
                >
                    <motion.span className="label" variants={itemVariants}>FOOD DELIVERY</motion.span>
                    <motion.h2 variants={itemVariants}>Quick & Easy <br />Campus Dining</motion.h2>
                    <motion.p variants={itemVariants}>
                        Skip the lines and order ahead. Get your favorite meals delivered
                        right to your location on campus. Fast, convenient, and always fresh.
                    </motion.p>
                    
                    <motion.button variants={itemVariants} className="order-btn" onClick={orderNow}>
                        <ShoppingBag size={20} /> Order Now
                    </motion.button>

                    <motion.div variants={itemVariants} className="delivery-badge">
                        <Clock size={18} />
                        <span>15-20 min delivery</span>
                    </motion.div>
                </motion.div>

                <motion.div 
                    className="delivery-visual"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="main-image-wrapper">
                        <img src="/images/redesign/delivery_burger.jpg" alt="Main Delivery Burger" className="main-img" />
                        
                        {/* Floating Satellites */}
                        <motion.div className="satellite sat-1" animate={floatAnimation}>
                            <img src="/images/redesign/delivery_fries.jpg" alt="Fries" />
                        </motion.div>
                        
                        <motion.div className="satellite sat-2" animate={floatAnimationDelayed}>
                            <img src="/images/redesign/delivery_icecream.jpg" alt="Ice Cream" />
                        </motion.div>
                        
                        <motion.div className="satellite sat-3" animate={floatAnimationFast}>
                            <img src="/images/redesign/delivery_drink.jpg" alt="Drink" />
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default QuickDeliverySection;
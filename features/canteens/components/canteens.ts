export interface Canteen {
    id: string;
    name: string;
    block: string;
    rating: number;
    description: string;
    openingHours: string;
    images: string[];
    logo?: string;
}

export const CANTEENS: Canteen[] = [
    {
        id: "punjabiBites",
        name: "Punjabi Bites",
        block: "Block A",
        rating: 4.4,
        description: "Authentic North Indian meals and tandoori specials.",
        openingHours: "9:00 AM - 9:00 PM",
        images: [
            "/images/punjabiBitesLogo.png",
            "/images/punjabiBitesHomePageImg.png",
            "/images/FOOD1.jpg",
            "/images/FOOD2.jpg"
        ],
        logo: "/images/punjabiBitesLogo.png"
    },
    {
        id: "rollsLane",
        name: "Rolls Lane",
        block: "Block A",
        rating: 4.2,
        description: "Delicious veg and non-veg rolls with refreshing beverages.",
        openingHours: "10:00 AM - 10:00 PM",
        images: [
            "/images/rollsLaneLogo.png",
            "/images/CANTEEN2.jpg",
            "/images/FOOD3.jpg",
            "/images/FOOD4.jpg"
        ],
        logo: "/images/rollsLaneLogo.png"
    },
    {
        id: "southernDelight",
        name: "Southern Delight",
        block: "Block A",
        rating: 4.1,
        description: "South Indian delicacies and filter coffee.",
        openingHours: "8:00 AM - 8:00 PM",
        images: [
            "/images/SouthernDelightLogo.png",
            "/images/CANTEEN3.jpg",
            "/images/FOOD1.jpg",
            "/images/FOOD2.jpg"
        ],
        logo: "/images/SouthernDelightLogo.png"
    },
    {
        id: "tasteOfDelhi",
        name: "Taste of Delhi",
        block: "Block A",
        rating: 4.3,
        description: "Authentic Indian cuisine with a modern twist.",
        openingHours: "10:00 AM - 11:00 PM",
        images: [
            "/images/tasteOfDelhiLogo.png",
            "/images/FOOD3.jpg",
            "/images/FOOD4.jpg",
            "/images/FOOD5.jpg"
        ],
        logo: "/images/tasteOfDelhiLogo.png"
    },
    {
        id: "cafeCoffeeDay",
        name: "Cafe Coffee Day",
        block: "Block B",
        rating: 4.0,
        description: "Coffee, tea and quick snacks.",
        openingHours: "7:00 AM - 7:00 PM",
        images: [
            "/images/CCD.jpg",
            "/images/ccdHomePageImg.png",
            "/images/FOOD1.jpg",
            "/images/FOOD2.jpg"
        ],
        logo: "/images/CCD.jpg"
    },
    {
        id: "dominos",
        name: "Dominos",
        block: "Dominos",
        rating: 4.5,
        description: "Popular pizzas chain with variety of pizzas and sides.",
        openingHours: "11:00 AM - 11:00 PM",
        images: [
            "/images/dominosLogo.png",
            "/images/CANTEEN1.jpg",
            "/images/FOOD3.jpg",
            "/images/FOOD4.jpg"
        ],
        logo: "/images/dominosLogo.png"
    },
    {
        id: "gianis",
        name: "Gianis",
        block: "Block B",
        rating: 4.7,
        description: "Famous for shakes, ice creams, and sweet treats.",
        openingHours: "11:00 AM - 11:00 PM",
        images: [
            "/images/Gianis.png",
            "/images/CANTEEN2.jpg",
            "/images/FOOD5.jpg",
            "/images/FOOD1.jpg"
        ],
        logo: "/images/Gianis.png"
    },
    {
        id: "bitesAndBrews",
        name: "Bites & Brews",
        block: "Block A",
        rating: 4.3,
        description: "Continental bites, burgers, and specialty beverages.",
        openingHours: "10:00 AM - 11:00 PM",
        images: [
            "/images/bitesAndBrewsLogo.png",
            "/images/CANTEEN3.jpg",
            "/images/FOOD2.jpg",
            "/images/FOOD3.jpg"
        ],
        logo: "/images/bitesAndBrewsLogo.png"
    },
    {
        id: "AmritsarHaveli",
        name: "Amritsari Haveli",
        block: "Block B",
        rating: 4.8,
        description: "Amritsari kulchas, parathas, and traditional Punjabi fare.",
        openingHours: "9:00 AM - 10:00 PM",
        images: [
            "/images/amritsariHaveliLogo.png",
            "/images/amritsariHaveliHomePageImg.png",
            "/images/FOOD4.jpg",
            "/images/FOOD5.jpg"
        ],
        logo: "/images/amritsariHaveliLogo.png"
    }
];

"""
Idempotent Seed Service for Rental Marketplace Categories and Rental Items.
"""

import logging
from sqlalchemy.orm import Session
from app.models.rental import RentalCategory, RentalItem, RentalImage
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def seed_default_rentals(db: Session):
    """Seed 10 rental categories and 25+ realistic rental items with images and providers."""
    # Ensure providers exist for assignment
    providers = db.query(User).filter(User.role == UserRole.PROVIDER).all()
    if not providers:
        # Fallback to any user
        providers = db.query(User).all()
    if not providers:
        return

    prov_1 = providers[0].id
    prov_2 = providers[1].id if len(providers) > 1 else prov_1
    prov_3 = providers[2].id if len(providers) > 2 else prov_1

    # 1. Standardize 10 Rental Categories
    categories_data = [
        {"name": "Vehicles", "slug": "vehicles", "description": "Electric scooters, city bikes, off-road bicycles, and adventure tourers.", "icon_url": "🛵"},
        {"name": "Cameras & Photography", "slug": "cameras-photography", "description": "DSLRs, mirrorless cameras, prime lenses, drones, and studio lighting.", "icon_url": "📷"},
        {"name": "Electronics", "slug": "electronics", "description": "4K projectors, high-end laptops, PA sound systems, and studio monitors.", "icon_url": "💻"},
        {"name": "Party & Event Equipment", "slug": "party-event-equipment", "description": "DJ consoles, disco lasers, canopy tents, buffet chafing sets, and seating.", "icon_url": "🎉"},
        {"name": "Camping & Outdoor", "slug": "camping-outdoor", "description": "Waterproof dome tents, trekking backpacks, sleeping bags, and portable stoves.", "icon_url": "⛺"},
        {"name": "Tools & Equipment", "slug": "tools-equipment", "description": "Power drills, high-pressure jet washers, ladders, and inverter generators.", "icon_url": "🛠️"},
        {"name": "Furniture", "slug": "furniture", "description": "Ergonomic office chairs, banquet tables, event seating, and studio setups.", "icon_url": "🪑"},
        {"name": "Dresses & Costumes", "slug": "dresses-costumes", "description": "Designer wedding lehengas, Italian tuxedos, formal suits, and cosplay outfits.", "icon_url": "👗"},
        {"name": "Gaming Equipment", "slug": "gaming-equipment", "description": "PS5 consoles, Xbox Series X, Meta Quest VR headsets, and sim racing wheels.", "icon_url": "🎮"},
        {"name": "Books & Study Equipment", "slug": "books-study-equipment", "description": "Exam prep master libraries, digital graphic tablets, and lab microscopes.", "icon_url": "📚"},
    ]

    cat_map = {}
    for c_data in categories_data:
        cat = db.query(RentalCategory).filter(RentalCategory.name.ilike(c_data["name"])).first()
        if not cat:
            cat = RentalCategory(
                name=c_data["name"],
                slug=c_data["slug"],
                description=c_data["description"],
                icon_url=c_data["icon_url"],
                is_active=True,
            )
            db.add(cat)
            db.flush()
        else:
            if not cat.slug:
                cat.slug = c_data["slug"]
                db.flush()
        cat_map[c_data["name"]] = cat

    # 2. Rich Prototype Rental Items
    items_data = [
        # Vehicles
        {
            "category": "Vehicles",
            "provider_id": prov_1,
            "name": "Ather 450X Gen 3 Electric Scooter",
            "description": "High-performance smart electric scooter with 105km range, Google maps navigation dashboard, fast charger, and 2 ISI full-face helmets included.",
            "location": "Indiranagar, Bengaluru",
            "price_per_day": 450.0,
            "security_deposit": 2500.0,
            "delivery_fee": 100.0,
            "condition": "Like New",
            "rating": 4.9,
            "review_count": 38,
            "images": [
                "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800",
                "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800",
            ],
        },
        {
            "category": "Vehicles",
            "provider_id": prov_2,
            "name": "Trek Marlin 7 Mountain Bike (29er)",
            "description": "Premium cross-country mountain bike with RockShox suspension fork, Shimano Deore 1x10 drivetrain, hydraulic disc brakes, and puncture-resistant tires.",
            "location": "Koramangala, Bengaluru",
            "price_per_day": 350.0,
            "security_deposit": 2000.0,
            "delivery_fee": 80.0,
            "condition": "Like New",
            "rating": 4.8,
            "review_count": 22,
            "images": [
                "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800",
                "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800",
            ],
        },
        # Cameras & Photography
        {
            "category": "Cameras & Photography",
            "provider_id": prov_1,
            "name": "Sony Alpha A7 IV Full-Frame Camera + 24-70mm GM Lens",
            "description": "33MP Full-frame mirrorless camera with 4K 60p 10-bit recording, real-time eye AF, 2x 128GB Pro SD cards, 3 extra batteries, and dual charger.",
            "location": "HSR Layout, Bengaluru",
            "price_per_day": 1499.0,
            "security_deposit": 8000.0,
            "delivery_fee": 150.0,
            "condition": "Like New",
            "rating": 4.9,
            "review_count": 64,
            "images": [
                "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
                "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800",
            ],
        },
        {
            "category": "Cameras & Photography",
            "provider_id": prov_3,
            "name": "DJI Mini 3 Pro Drone Combo + RC Smart Controller",
            "description": "Sub-249g ultra-compact drone with 4K HDR video, true vertical shooting, tri-directional obstacle sensing, and 3x intelligent flight batteries.",
            "location": "Whitefield, Bengaluru",
            "price_per_day": 1200.0,
            "security_deposit": 6000.0,
            "delivery_fee": 120.0,
            "condition": "Like New",
            "rating": 4.9,
            "review_count": 41,
            "images": [
                "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800",
                "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800",
            ],
        },
        {
            "category": "Cameras & Photography",
            "provider_id": prov_2,
            "name": "GoPro HERO12 Black Action Camera Creator Edition",
            "description": "5.3K60 HDR video, Volta battery grip, Media Mod shotgun mic, Light Mod, magnetic swivel clip, and 256GB Extreme Pro MicroSD card.",
            "location": "JP Nagar, Bengaluru",
            "price_per_day": 599.0,
            "security_deposit": 3000.0,
            "delivery_fee": 100.0,
            "condition": "Brand New",
            "rating": 4.7,
            "review_count": 29,
            "images": [
                "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800",
            ],
        },
        # Electronics
        {
            "category": "Electronics",
            "provider_id": prov_1,
            "name": "Optoma 4K UHD Smart Cinema Projector + 120-inch Stand Screen",
            "description": "3,400 Lumens true 4K HDR ultra-bright home theater projector with low 4.2ms input lag, 120-inch anti-crease tripod screen, and HDMI cables.",
            "location": "Indiranagar, Bengaluru",
            "price_per_day": 799.0,
            "security_deposit": 4000.0,
            "delivery_fee": 200.0,
            "condition": "Like New",
            "rating": 4.9,
            "review_count": 52,
            "images": [
                "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800",
                "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800",
            ],
        },
        {
            "category": "Electronics",
            "provider_id": prov_3,
            "name": "Apple MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD)",
            "description": "Monster performance laptop for 4K/8K video editing, 3D rendering, and coding with Liquid Retina XDR display, MagSafe charger, and carry sleeve.",
            "location": "Koramangala, Bengaluru",
            "price_per_day": 1800.0,
            "security_deposit": 15000.0,
            "delivery_fee": 150.0,
            "condition": "Like New",
            "rating": 5.0,
            "review_count": 19,
            "images": [
                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
            ],
        },
        # Party & Event Equipment
        {
            "category": "Party & Event Equipment",
            "provider_id": prov_2,
            "name": "JBL PartyBox 710 High-Power Bluetooth Speaker (800W)",
            "description": "Massive 800-watt RMS sound with dynamic light show, dual inputs for guitar and wireless mics, splashproof build, and built-in wheels.",
            "location": "BTM Layout, Bengaluru",
            "price_per_day": 999.0,
            "security_deposit": 5000.0,
            "delivery_fee": 150.0,
            "condition": "Like New",
            "rating": 4.9,
            "review_count": 78,
            "images": [
                "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800",
            ],
        },
        {
            "category": "Party & Event Equipment",
            "provider_id": prov_1,
            "name": "Pioneer DDJ-FLX6-GT 4-Channel DJ Controller Kit",
            "description": "Professional 4-channel DJ controller with full-size jog wheels, Merge FX, Rekordbox/Serato support, RCA/XLR cables, and headphone bundle.",
            "location": "MG Road, Bengaluru",
            "price_per_day": 1100.0,
            "security_deposit": 6000.0,
            "delivery_fee": 100.0,
            "condition": "Good",
            "rating": 4.8,
            "review_count": 34,
            "images": [
                "https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=800",
            ],
        },
        # Camping & Outdoor
        {
            "category": "Camping & Outdoor",
            "provider_id": prov_3,
            "name": "Quechua 4-Person Waterproof Blackout Camping Tent + 4 Sleeping Bags",
            "description": "Fresh & Black patented technology tent keeping interior cool and dark, wind-resistant up to 50 km/h, waterproof flysheet, and 4 thermal sleeping bags.",
            "location": "Sarjapur Road, Bengaluru",
            "price_per_day": 499.0,
            "security_deposit": 2000.0,
            "delivery_fee": 100.0,
            "condition": "Like New",
            "rating": 4.8,
            "review_count": 45,
            "images": [
                "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800",
                "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800",
            ],
        },
        {
            "category": "Camping & Outdoor",
            "provider_id": prov_2,
            "name": "Portable Multi-Fuel Camping Stove & 4-Person Cookware Kit",
            "description": "Compact piezo-ignition camping stove, anodized aluminum pots/pans, heat-resistant handles, wind shield, and refillable butane canister set.",
            "location": "Yelahanka, Bengaluru",
            "price_per_day": 250.0,
            "security_deposit": 1000.0,
            "delivery_fee": 80.0,
            "condition": "Good",
            "rating": 4.7,
            "review_count": 18,
            "images": [
                "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800",
            ],
        },
        # Tools & Equipment
        {
            "category": "Tools & Equipment",
            "provider_id": prov_1,
            "name": "Bosch Professional GSB 18V Cordless Hammer Drill & Impact Kit",
            "description": "Heavy-duty 18V brushless motor drill kit with 2x 4.0Ah ProCORE batteries, 30-piece masonry/steel bit set, and shockproof carry case.",
            "location": "Rajajinagar, Bengaluru",
            "price_per_day": 399.0,
            "security_deposit": 2000.0,
            "delivery_fee": 100.0,
            "condition": "Like New",
            "rating": 4.8,
            "review_count": 31,
            "images": [
                "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800",
            ],
        },
        {
            "category": "Tools & Equipment",
            "provider_id": prov_2,
            "name": "Kärcher K5 High-Pressure Washer (145 Bar, 500 L/h)",
            "description": "Water-cooled induction motor pressure washer with Vario Power spray lance, Dirt Blaster turbo nozzle, foam cannon, and 10m high-pressure hose.",
            "location": "Banashankari, Bengaluru",
            "price_per_day": 499.0,
            "security_deposit": 2500.0,
            "delivery_fee": 120.0,
            "condition": "Like New",
            "rating": 4.9,
            "review_count": 27,
            "images": [
                "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800",
            ],
        },
        # Furniture
        {
            "category": "Furniture",
            "provider_id": prov_3,
            "name": "Herman Miller Aeron Ergonomic Task Chair (Size B)",
            "description": "The gold standard in ergonomic seating with Pellicle 8Z breathable mesh, PostureFit SL adjustable lumbar support, and fully adjustable armrests.",
            "location": "Indiranagar, Bengaluru",
            "price_per_day": 350.0,
            "security_deposit": 3000.0,
            "delivery_fee": 150.0,
            "condition": "Like New",
            "rating": 4.9,
            "review_count": 36,
            "images": [
                "https://images.unsplash.com/photo-1580481077197-20b127394d6e?w=800",
            ],
        },
        {
            "category": "Furniture",
            "provider_id": prov_1,
            "name": "Folding Event Banquet Table (6ft) + 8 Padded Chairs Set",
            "description": "Heavy-duty commercial grade UV-protected HDPE folding table and 8 powder-coated steel frame cushioned chairs for home parties or meetings.",
            "location": "Koramangala, Bengaluru",
            "price_per_day": 450.0,
            "security_deposit": 2000.0,
            "delivery_fee": 150.0,
            "condition": "Good",
            "rating": 4.7,
            "review_count": 24,
            "images": [
                "https://images.unsplash.com/photo-1530629013299-6cb10d168419?w=800",
            ],
        },
        # Dresses & Costumes
        {
            "category": "Dresses & Costumes",
            "provider_id": prov_2,
            "name": "Royal Emerald Silk Designer Wedding Sherwani Set",
            "description": "Hand-embroidered zardozi royal raw silk sherwani with matching stole, churidar, safa turban, and embroidered mojari shoes (Size 40/42).",
            "location": "Jayanagar, Bengaluru",
            "price_per_day": 1299.0,
            "security_deposit": 5000.0,
            "delivery_fee": 100.0,
            "condition": "Brand New",
            "rating": 5.0,
            "review_count": 16,
            "images": [
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800",
            ],
        },
        {
            "category": "Dresses & Costumes",
            "provider_id": prov_3,
            "name": "Crimson Red Velvet Bridal Lehenga with Zari Work",
            "description": "Opulent bridal lehenga with heavy real zari hand-embroidery, double net dupattas, matching blouse piece, and can-can underskirt.",
            "location": "Malleshwaram, Bengaluru",
            "price_per_day": 1599.0,
            "security_deposit": 6000.0,
            "delivery_fee": 100.0,
            "condition": "Brand New",
            "rating": 4.9,
            "review_count": 21,
            "images": [
                "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800",
            ],
        },
        # Gaming Equipment
        {
            "category": "Gaming Equipment",
            "provider_id": prov_1,
            "name": "Sony PlayStation 5 Console + 4 DualSense Controllers + 5 Games",
            "description": "PS5 Disc Edition with FIFA 24, Spider-Man 2, God of War Ragnarök, Mortal Kombat 1, 4 wireless controllers, and dual charging dock.",
            "location": "Indiranagar, Bengaluru",
            "price_per_day": 699.0,
            "security_deposit": 5000.0,
            "delivery_fee": 120.0,
            "condition": "Like New",
            "rating": 4.9,
            "review_count": 89,
            "images": [
                "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800",
                "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800",
            ],
        },
        {
            "category": "Gaming Equipment",
            "provider_id": prov_2,
            "name": "Meta Quest 3 VR Headset (512GB) + Elite Strap Bundle",
            "description": "Breakthrough mixed reality headset with 4K+ Infinite Display, Touch Plus controllers, preloaded with Beat Saber, Superhot VR, and Eleven Table Tennis.",
            "location": "HSR Layout, Bengaluru",
            "price_per_day": 899.0,
            "security_deposit": 6000.0,
            "delivery_fee": 100.0,
            "condition": "Brand New",
            "rating": 4.9,
            "review_count": 47,
            "images": [
                "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800",
            ],
        },
        {
            "category": "Gaming Equipment",
            "provider_id": prov_3,
            "name": "Logitech G29 Driving Force Racing Wheel & Pedals + Shifter",
            "description": "Dual-motor force feedback racing wheel with stainless steel paddle shifters, 900-degree rotation, non-linear brake pedal, and 6-speed shifter.",
            "location": "Whitefield, Bengaluru",
            "price_per_day": 550.0,
            "security_deposit": 3500.0,
            "delivery_fee": 120.0,
            "condition": "Like New",
            "rating": 4.8,
            "review_count": 28,
            "images": [
                "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800",
            ],
        },
        # Books & Study Equipment
        {
            "category": "Books & Study Equipment",
            "provider_id": prov_1,
            "name": "XP-Pen Artist 16 (2nd Gen) Digital Drawing & Pen Display Tablet",
            "description": "15.4-inch Full HD drawing display with 127% sRGB color gamut, X3 Elite stylus with 8192 levels of pressure sensitivity, and adjustable stand.",
            "location": "Koramangala, Bengaluru",
            "price_per_day": 399.0,
            "security_deposit": 2500.0,
            "delivery_fee": 100.0,
            "condition": "Like New",
            "rating": 4.8,
            "review_count": 19,
            "images": [
                "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800",
            ],
        },
        {
            "category": "Books & Study Equipment",
            "provider_id": prov_2,
            "name": "AmScope 40X-2000X Binocular Biological Lab Microscope Kit",
            "description": "Professional compound biological microscope with LED illumination, mechanical stage, 3D double layer, immersion oil, and 50 prepared glass slides.",
            "location": "JP Nagar, Bengaluru",
            "price_per_day": 350.0,
            "security_deposit": 2500.0,
            "delivery_fee": 100.0,
            "condition": "Good",
            "rating": 4.7,
            "review_count": 14,
            "images": [
                "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
            ],
        },
    ]

    for item_data in items_data:
        cat = cat_map.get(item_data["category"])
        if not cat:
            continue

        existing_item = db.query(RentalItem).filter(RentalItem.name == item_data["name"]).first()
        if not existing_item:
            new_item = RentalItem(
                category_id=cat.id,
                provider_id=item_data["provider_id"],
                name=item_data["name"],
                description=item_data["description"],
                location=item_data["location"],
                price_per_day=item_data["price_per_day"],
                security_deposit=item_data["security_deposit"],
                delivery_fee=item_data["delivery_fee"],
                is_delivery_available=True,
                is_pickup_available=True,
                condition=item_data["condition"],
                quantity=1,
                is_active=True,
                rating=item_data["rating"],
                review_count=item_data["review_count"],
            )
            db.add(new_item)
            db.flush()

            for idx, img_url in enumerate(item_data["images"]):
                img = RentalImage(
                    rental_item_id=new_item.id,
                    image_url=img_url,
                    is_primary=(idx == 0),
                )
                db.add(img)

    db.commit()
    logger.info("Rental categories and items seeded successfully.")

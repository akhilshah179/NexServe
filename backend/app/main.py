"""
NexServe — FastAPI Application Entry Point.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine, SessionLocal
import app.models  # Ensures all SQLAlchemy models are registered
from app.models.service import Category, Service
from app.models.user import User, UserRole, VerificationStatus
from fastapi.staticfiles import StaticFiles
from app.routes import (
    health_router,
    auth_router,
    services_router,
    bookings_router,
    contact_router,
    admin_router,
    payments_router,
    addresses_router,
    providers_router,
    reviews_router,
    notifications_router,
    chat_router,
    emergency_router,
    availability_router,
    ws_router,
    pricing_router,
    coupons_router,
    referrals_router,
    recommendations_router,
    attachments_router,
    rentals_router,
)




# ── Database Initialization & Seeding ─────────────────────
def _migrate_columns():
    """Ensure newly added columns exist in existing database tables."""
    from sqlalchemy import text
    with engine.connect() as conn:
        # Check users table columns
        user_cols = {
            "referral_code": "TEXT",
            "referral_credits": "FLOAT DEFAULT 0.0",
            "booking_mode": "TEXT DEFAULT 'instant_booking'",
        }
        for col, col_type in user_cols.items():
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists

        # Check bookings table columns
        booking_cols = {
            "booking_mode": "TEXT DEFAULT 'instant_booking'",
            "base_price": "FLOAT",
            "discount_amount": "FLOAT DEFAULT 0.0",
            "referral_discount": "FLOAT DEFAULT 0.0",
            "coupon_id": "INTEGER",
            "pricing_breakdown": "TEXT",
        }
        for col, col_type in booking_cols.items():
            try:
                conn.execute(text(f"ALTER TABLE bookings ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass  # Column already exists


def init_db():
    """Create database tables and seed default categories, providers, and services."""
    _migrate_columns()
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:

        # Standardize 10 primary categories
        target_categories = [
            {"name": "Home Cleaning", "description": "Deep cleaning, kitchen, bathroom, and sofa sanitization services.", "icon_url": "🏠"},
            {"name": "AC Repair & Services", "description": "AC repair, installation, maintenance, and gas refilling.", "icon_url": "❄️"},
            {"name": "Salon & Beauty", "description": "Haircuts, styling, facials, coloring, and grooming at home.", "icon_url": "💇"},
            {"name": "Plumbing", "description": "Pipe repairs, installations, leak fixing, and drainage services.", "icon_url": "🔧"},
            {"name": "Electrical", "description": "Wiring, fixture installation, panel repair, and safety checks.", "icon_url": "⚡"},
            {"name": "Car Services", "description": "Car detailing, periodic maintenance, battery care, and wash.", "icon_url": "🚗"},
            {"name": "Tutoring", "description": "Expert 1-on-1 tutors for STEM, exam prep, languages, and coding.", "icon_url": "📚"},
            {"name": "Fitness", "description": "Personal trainers, yoga instructors, HIIT, and posture coaches.", "icon_url": "💪"},
            {"name": "Pest Control", "description": "Termite treatment, cockroach elimination, and pest management.", "icon_url": "🪲"},
            {"name": "Laundry", "description": "Wash & iron, dry cleaning, shoe care, and curtain washing.", "icon_url": "🧹"},
        ]

        # Ensure all 10 categories exist
        category_map = {}
        for cat_info in target_categories:
            cat = db.query(Category).filter(Category.name.ilike(cat_info["name"])).first()
            # Also check old alias names
            if not cat:
                if cat_info["name"] == "AC Repair & Services":
                    cat = db.query(Category).filter(Category.name.ilike("AC Repair")).first()
                elif cat_info["name"] == "Salon & Beauty":
                    cat = db.query(Category).filter(Category.name.ilike("Salon & Spa")).first()
                elif cat_info["name"] == "Electrical":
                    cat = db.query(Category).filter(Category.name.ilike("Electrician")).first()
                elif cat_info["name"] == "Fitness":
                    cat = db.query(Category).filter(Category.name.ilike("Fitness Training")).first()
                elif cat_info["name"] == "Car Services":
                    cat = db.query(Category).filter(Category.name.ilike("Car Service")).first()

            if cat:
                cat.name = cat_info["name"]
                cat.description = cat_info["description"]
                cat.icon_url = cat_info["icon_url"]
            else:
                cat = Category(
                    name=cat_info["name"],
                    description=cat_info["description"],
                    icon_url=cat_info["icon_url"],
                )
                db.add(cat)
            db.flush()
            category_map[cat_info["name"]] = cat

        db.commit()

        _seed_providers_and_services(db, category_map)

        # Seed default coupons, referral codes, provider availability, and rental marketplace catalog
        from app.services.coupon_service import seed_default_coupons
        from app.services.referral_service import ensure_user_referral_code
        from app.services.availability_service import seed_default_provider_availability
        from app.services.rental_seed_service import seed_default_rentals
        seed_default_coupons(db)
        seed_default_provider_availability(db)
        seed_default_rentals(db)

        for u in db.query(User).all():
            ensure_user_referral_code(db, u)

    finally:
        db.close()



def _seed_providers_and_services(db, category_map):
    """Seed 3 verified providers per category (30 total) with realistic data and promo coupons."""
    providers_specs = [
        # (Category, Name, Email, Bio, Location, Lat, Lng, Rating, Reviews, Exp, HourlyRate, BookingMode)
        # 1. Home Cleaning
        ("Home Cleaning", "Priya Sharma", "priya.sharma@nexserve.com", "Expert in deep cleaning, kitchen sanitization, and eco-friendly home care.", "Koramangala, Bengaluru", 12.9352, 77.6245, 4.9, 156, 5, 499, "instant_booking"),
        ("Home Cleaning", "Rahul Verma", "rahul.verma@nexserve.com", "Professional residential cleaning specialist covering central and east Bengaluru.", "Indiranagar, Bengaluru", 12.9784, 77.6408, 4.7, 98, 3, 399, "instant_booking"),
        ("Home Cleaning", "Geetha Nambiar", "geetha.nambiar@nexserve.com", "Master housekeeping, upholstery stain removal, and villa deep cleaning expert.", "HSR Layout, Bengaluru", 12.9121, 77.6446, 4.8, 142, 6, 449, "request_booking"),

        # 2. AC Repair & Services
        ("AC Repair & Services", "Suresh Kumar", "suresh.kumar@nexserve.com", "Certified multi-brand AC technician — Daikin, Voltas, Samsung, LG.", "HSR Layout, Bengaluru", 12.9121, 77.6446, 4.8, 210, 7, 599, "instant_booking"),
        ("AC Repair & Services", "Deepak Singh", "deepak.singh@nexserve.com", "AC installation, precision copper piping, gas refilling & tuning specialist.", "Whitefield, Bengaluru", 12.9698, 77.7500, 4.6, 87, 4, 549, "instant_booking"),
        ("AC Repair & Services", "Rajesh Gowda", "rajesh.gowda@nexserve.com", "Inverter AC specialist, PCB board diagnostics, and jet pump deep coil wash.", "Electronic City, Bengaluru", 12.8452, 77.6602, 4.9, 175, 8, 649, "request_booking"),

        # 3. Salon & Beauty
        ("Salon & Beauty", "Ananya Patel", "ananya.patel@nexserve.com", "Celebrity hairstylist & cosmetologist offering premium salon treatments at home.", "JP Nagar, Bengaluru", 12.9063, 77.5857, 4.9, 312, 8, 799, "instant_booking"),
        ("Salon & Beauty", "Meera Reddy", "meera.reddy@nexserve.com", "Bridal makeup artist, facial rejuvenation specialist, and licensed aesthetician.", "MG Road, Bengaluru", 12.9756, 77.6094, 4.8, 245, 6, 699, "instant_booking"),
        ("Salon & Beauty", "Divya Krishnan", "divya.krishnan@nexserve.com", "Certified hair colorist, organic fruit facials, and manicure/pedicure specialist.", "Jayanagar, Bengaluru", 12.9308, 77.5838, 4.7, 189, 5, 599, "request_booking"),

        # 4. Plumbing
        ("Plumbing", "Mohammed Ismail", "ismail.plumber@nexserve.com", "Master plumber — pipe fitting, geyser lines, and high-pressure leak repairs.", "Rajajinagar, Bengaluru", 12.9982, 77.5530, 4.8, 198, 12, 449, "instant_booking"),
        ("Plumbing", "Ganesh Hegde", "ganesh.hegde@nexserve.com", "Drain unblocking, sanitary ware fixture setup, and motor pump overhaul.", "Yelahanka, Bengaluru", 13.1007, 77.5963, 4.6, 89, 4, 399, "instant_booking"),
        ("Plumbing", "Basavaraj Patil", "basavaraj.patil@nexserve.com", "Commercial & residential plumbing installations with 10+ years experience.", "BTM Layout, Bengaluru", 12.9166, 77.6101, 4.9, 230, 11, 499, "request_booking"),

        # 5. Electrical
        ("Electrical", "Srinivas Murthy", "srinivas.electric@nexserve.com", "Licensed electrician — whole-house rewiring, MCB panels, inverter & UPS setup.", "Banashankari, Bengaluru", 12.9255, 77.5468, 4.8, 176, 10, 499, "instant_booking"),
        ("Electrical", "Naveen Prakash", "naveen.electric@nexserve.com", "Smart home electrical switchboards, appliance hookup, and load safety testing.", "Sarjapur Road, Bengaluru", 12.9237, 77.6877, 4.7, 134, 6, 549, "instant_booking"),
        ("Electrical", "Chandrashekar K", "chandra.electric@nexserve.com", "Industrial & domestic electrician, 3-phase line wiring, and earthing specialist.", "Malleshwaram, Bengaluru", 13.0031, 77.5643, 4.9, 215, 9, 599, "request_booking"),

        # 6. Car Services
        ("Car Services", "Karthik Sundaram", "karthik.auto@nexserve.com", "Complete doorstep car detailing, paint correction, interior foam wash.", "BTM Layout, Bengaluru", 12.9166, 77.6101, 4.7, 167, 9, 899, "instant_booking"),
        ("Car Services", "Ravi Teja", "ravi.speedfix@nexserve.com", "Periodic car maintenance, synthetic engine oil change, and 30-point inspection.", "Hebbal, Bengaluru", 13.0358, 77.5970, 4.6, 112, 5, 799, "instant_booking"),
        ("Car Services", "Manjunath Auto", "manjunath.auto@nexserve.com", "Brake overhaul, battery diagnostic replacement, and underbody anti-rust coating.", "Marathahalli, Bengaluru", 12.9591, 77.6974, 4.8, 145, 8, 849, "request_booking"),

        # 7. Tutoring
        ("Tutoring", "Dr. Arun Nair", "arun.nair@nexserve.com", "PhD in Mathematics — coaching for JEE Advanced, NEET Physics, and Olympiads.", "Electronic City, Bengaluru", 12.8452, 77.6602, 4.9, 178, 10, 899, "instant_booking"),
        ("Tutoring", "Sneha Gupta", "sneha.gupta@nexserve.com", "STEM, Coding, and English communication tutor for CBSE, ICSE & IGCSE students.", "Marathahalli, Bengaluru", 12.9591, 77.6974, 4.7, 134, 5, 649, "instant_booking"),
        ("Tutoring", "Prof. Ranganathan", "ranga.tutor@nexserve.com", "University physics & mathematics lecturer offering 1-on-1 conceptual mastery.", "Koramangala, Bengaluru", 12.9352, 77.6245, 4.9, 195, 14, 999, "request_booking"),

        # 8. Fitness
        ("Fitness", "Vikram Joshi", "vikram.joshi@nexserve.com", "Certified personal trainer and sports nutritionist — HIIT, strength & hypertrophy.", "Jayanagar, Bengaluru", 12.9308, 77.5838, 4.8, 189, 6, 749, "instant_booking"),
        ("Fitness", "Kavya Rao", "kavya.rao@nexserve.com", "Hatha & Vinyasa Yoga instructor certified by Isha Foundation. Stress relief & core.", "Malleshwaram, Bengaluru", 13.0031, 77.5643, 4.9, 223, 8, 599, "instant_booking"),
        ("Fitness", "Tanmay Sen", "tanmay.sen@nexserve.com", "CrossFit level 2 coach and body transformation specialist with custom diet plans.", "Indiranagar, Bengaluru", 12.9784, 77.6408, 4.7, 115, 5, 699, "request_booking"),

        # 9. Pest Control
        ("Pest Control", "Sunil SafeGuard", "sunil.safeguard@nexserve.com", "Eco-friendly herbal gel pest management for cockroaches, ants, and bed bugs.", "Koramangala, Bengaluru", 12.9352, 77.6245, 4.7, 134, 7, 699, "instant_booking"),
        ("Pest Control", "Amit Sharma", "amit.pestfree@nexserve.com", "Termite barrier drill-fill-seal treatment and residential pest elimination.", "Whitefield, Bengaluru", 12.9698, 77.7500, 4.5, 76, 4, 599, "instant_booking"),
        ("Pest Control", "Ramesh PestCare", "ramesh.pestcare@nexserve.com", "Odorless whole-house fogging and commercial pest control with 1-year warranty.", "Rajajinagar, Bengaluru", 12.9982, 77.5530, 4.8, 160, 9, 749, "request_booking"),

        # 10. Laundry
        ("Laundry", "Lakshmi Devi", "lakshmi.freshfold@nexserve.com", "Premium doorstep wash, fold, crisp steam iron, and fabric care.", "Indiranagar, Bengaluru", 12.9784, 77.6408, 4.8, 189, 5, 299, "instant_booking"),
        ("Laundry", "Arjun CleanPress", "arjun.cleanpress@nexserve.com", "Dry cleaning suits, designer garments, delicate silk saree care, and shoe wash.", "JP Nagar, Bengaluru", 12.9063, 77.5857, 4.7, 123, 3, 249, "instant_booking"),
        ("Laundry", "Pooja WashWorks", "pooja.washworks@nexserve.com", "Heavy curtain wash, wool quilt sanitation, and express 24h doorstep laundry.", "HSR Layout, Bengaluru", 12.9121, 77.6446, 4.9, 140, 6, 349, "request_booking"),
    ]

    # Create or update provider users
    provider_objects = {}
    for cat_name, name, email, bio, loc, lat, lng, rat, rev, exp, rate, b_mode in providers_specs:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                full_name=name,
                role=UserRole.PROVIDER,
                is_active=True,
                google_id=f"seed-{email}",
                bio=bio,
                location=loc,
                latitude=lat,
                longitude=lng,
                rating=rat,
                review_count=rev,
                experience_years=exp,
                hourly_rate=rate,
                booking_mode=b_mode,
            )
            db.add(user)
            db.flush()
        else:
            user.full_name = name
            user.role = UserRole.PROVIDER
            user.is_active = True
            user.bio = bio
            user.location = loc
            user.latitude = lat
            user.longitude = lng
            user.rating = rat
            user.review_count = rev
            user.experience_years = exp
            user.hourly_rate = rate
            user.booking_mode = b_mode
        if cat_name not in provider_objects:
            provider_objects[cat_name] = []
        provider_objects[cat_name].append(user)

    db.commit()

    # 4 Services per Category specifications: (title, description, price, duration_mins)
    services_catalog = {
        "Home Cleaning": [
            ("Deep Cleaning", "Full home intensive deep cleaning covering living areas, bedrooms, scrubbing, and sanitization.", 1499.0, 180),
            ("Kitchen Cleaning", "Thorough degreasing of chimney, stovetop, countertops, cabinets, and floor scrubbing.", 699.0, 90),
            ("Bathroom Cleaning", "Deep stain removal, tile descaling, toilet & fixture disinfection, and mirror shine.", 499.0, 60),
            ("Sofa Cleaning", "Shampooing, vacuuming, and fabric stain removal for 3-5 seater sofas and cushions.", 599.0, 60),
        ],
        "AC Repair & Services": [
            ("AC Repair", "Comprehensive troubleshooting, electrical diagnostics, capacitor, fan, and PCB repair.", 599.0, 60),
            ("AC Installation", "Professional split/window AC indoor & outdoor mounting, copper piping, and testing.", 1199.0, 90),
            ("AC Maintenance", "Full filter wash, cooling coil cleaning, jet pump wash, and performance tuning.", 499.0, 45),
            ("Gas Refilling", "Refrigerant leak detection, pressure testing, and complete R32/R410A gas top-up.", 1899.0, 60),
        ],
        "Salon & Beauty": [
            ("Haircut", "Custom salon haircut, hair wash, scalp massage, and precision styling at home.", 399.0, 45),
            ("Hair Styling", "Blow dry, curling, straightening, and event hair styling with premium products.", 699.0, 60),
            ("Facial", "Organic brightening & deep cleansing facial, exfoliating scrub, and hydration mask.", 899.0, 75),
            ("Hair Coloring", "Root touch-up, global hair color, or balayage highlights using ammonia-free dyes.", 1299.0, 90),
        ],
        "Plumbing": [
            ("Leak Repair & Pipe Fixing", "Emergency pipe leak detection, sealant application, and pipe section replacement.", 399.0, 45),
            ("Bathroom Fixture Installation", "Installation of washbasins, showers, mixer taps, diverters, and towel rails.", 499.0, 60),
            ("Drain & Toilet Unclogging", "High-pressure drain jetting and toilet blockage clearance without tile damage.", 549.0, 60),
            ("Water Heater & Geyser Service", "Geyser element descaling, thermostat repair, inlet/outlet valve replacement.", 649.0, 60),
        ],
        "Electrical": [
            ("Wiring & Switchboard Repair", "Short-circuit troubleshooting, modular switchboard repair, and load testing.", 399.0, 45),
            ("Ceiling Fan & Light Installation", "Mounting and connection of ceiling fans, chandeliers, spotlights, and LEDs.", 299.0, 30),
            ("MCB Panel & Fuse Repair", "Main breaker replacement, MCB tripping resolution, and grounding check.", 599.0, 60),
            ("Appliance Setup & Inverter Service", "Heavy appliance electrical hookup, inverter battery check, and rewiring.", 699.0, 60),
        ],
        "Car Services": [
            ("Full Car Detailing", "Interior deep vacuuming, steam sanitization, exterior clay bar, and ceramic polish.", 1999.0, 180),
            ("Periodic Car Maintenance", "Engine oil replacement, oil filter, air filter, brake inspection, and 30-point check.", 2499.0, 240),
            ("Brake & Battery Service", "Brake pad inspection, brake fluid top-up, battery health check, and terminal cleanup.", 799.0, 60),
            ("Car Wash & Exterior Wax", "High pressure foam wash, underbody cleaning, tire dressing, and carnauba wax shine.", 699.0, 60),
        ],
        "Tutoring": [
            ("Mathematics & Science 1-on-1", "Personalized academic mentoring, concept clarity, and homework problem-solving.", 899.0, 60),
            ("Board & Exam Prep (JEE/NEET)", "Targeted exam strategy, previous years question analysis, and speed drills.", 1199.0, 90),
            ("English & Communication Coaching", "Spoken English fluency, vocabulary building, grammar, and essay writing.", 699.0, 60),
            ("Coding & Computer Science", "Hands-on coding lessons in Python, JavaScript, and algorithmic problem solving.", 999.0, 60),
        ],
        "Fitness": [
            ("Personal Fitness Training", "Tailored strength & hypertrophy workout, posture correction, and workout roadmap.", 749.0, 60),
            ("Yoga & Meditation Flow", "Pranayama breathwork, asana alignment, stress relief, and mindfulness meditation.", 599.0, 60),
            ("Weight Loss & HIIT Coaching", "High-intensity metabolic conditioning, calorie burn circuit, and nutrition tips.", 799.0, 60),
            ("Posture & Core Conditioning", "Lower back strengthening, ergonomic mobility exercises, and core stability.", 649.0, 60),
        ],
        "Pest Control": [
            ("General Pest Control", "Eco-friendly herbal gel baiting and odorless spray for cockroaches, ants & spiders.", 699.0, 60),
            ("Termite Inspection & Treatment", "Drill-fill-seal barrier treatment protecting wooden fixtures and foundation.", 1499.0, 120),
            ("Cockroach & Bed Bug Elimination", "Specialized dual-session steam and chemical eradication with 6-month warranty.", 899.0, 60),
            ("Mosquito & Rodent Management", "Indoor thermal fogging, trap placement, and pest entry point blocking.", 799.0, 60),
        ],
        "Laundry": [
            ("Wash, Fold & Iron Bundle", "Machine washing with fabric conditioner and steam crisp ironing for 10-15 items.", 299.0, 30),
            ("Premium Dry Cleaning", "Gentle solvent care, stain extraction, and packaging for suits, blazers & silks.", 599.0, 30),
            ("Shoe Cleaning & Care", "Deep scrub, midsole whitening, deodorization, and suede protection treatment.", 399.0, 30),
            ("Curtain & Quilt Deep Wash", "Heavy fabric wash, dust mite removal, anti-allergen treatment, and press.", 499.0, 45),
        ],
    }

    # Ensure all services exist for each category
    for cat_name, svc_list in services_catalog.items():
        cat = category_map.get(cat_name)
        if not cat:
            continue

        provs = provider_objects.get(cat_name, [])
        if not provs:
            continue

        for idx, (title, desc, price, dur) in enumerate(svc_list):
            prov = provs[idx % len(provs)]
            existing_svc = (
                db.query(Service)
                .filter(Service.category_id == cat.id, Service.title.ilike(title))
                .first()
            )
            if not existing_svc:
                svc = Service(
                    title=title,
                    description=desc,
                    price=price,
                    duration_minutes=dur,
                    category_id=cat.id,
                    provider_id=prov.id,
                    is_active=True,
                    rating=prov.rating,
                    review_count=prov.review_count,
                )
                db.add(svc)
            else:
                existing_svc.description = desc
                existing_svc.price = price
                existing_svc.duration_minutes = dur
                existing_svc.is_active = True
                existing_svc.category_id = cat.id

    db.commit()

    # Seed an admin user for testing
    admin_user = db.query(User).filter((User.email == "admin@nexserve.com") | (User.role == UserRole.ADMIN)).first()
    if not admin_user:
        admin = User(
            email="admin@nexserve.com",
            full_name="NexServe Admin",
            role=UserRole.ADMIN,
            is_active=True,
            google_id="seeded-admin-1",
            bio="Platform administrator",
            location="Bengaluru, India",
            rating=5.0,
            review_count=0,
            experience_years=0,
            hourly_rate=0,
        )
        db.add(admin)
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    import asyncio
    from app.core.ws_manager import ws_manager
    ws_manager.set_loop(asyncio.get_running_loop())
    if os.getenv("TESTING") != "true":
        init_db()
    yield




# ── Create the FastAPI App ────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart Multi-Service Booking and Management System API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS Middleware ───────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Uploads Mount ──────────────────────────────────
uploads_dir = os.path.join(os.getcwd(), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "bookings"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# ── Include Routers ───────────────────────────────────────
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(services_router, prefix="/api")
app.include_router(services_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(contact_router, prefix="/api")
app.include_router(contact_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(addresses_router, prefix="/api")
app.include_router(addresses_router, prefix="/api/v1")
app.include_router(providers_router, prefix="/api")
app.include_router(providers_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(emergency_router, prefix="/api")
app.include_router(emergency_router, prefix="/api/v1")
app.include_router(availability_router, prefix="/api")
app.include_router(availability_router, prefix="/api/v1")

# Advanced Features: Real-Time WebSockets, Pricing, Coupons, Referrals, Recommendations, Attachments
app.include_router(ws_router)
app.include_router(pricing_router, prefix="/api")
app.include_router(pricing_router, prefix="/api/v1")
app.include_router(coupons_router, prefix="/api")
app.include_router(coupons_router, prefix="/api/v1")
app.include_router(referrals_router, prefix="/api")
app.include_router(referrals_router, prefix="/api/v1")
app.include_router(recommendations_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api/v1")
app.include_router(attachments_router, prefix="/api")
app.include_router(attachments_router, prefix="/api/v1")
app.include_router(rentals_router, prefix="/api")
app.include_router(rentals_router, prefix="/api/v1")




# ── Root Endpoint ─────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    """Welcome endpoint — confirms the API is running."""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/v1/health",
    }

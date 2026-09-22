import { useState, useEffect } from "react";
import { ArrowRight, TrendingUp, Tag, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ListingCard, {
  SkeletonCard,
} from "../../components/listings/ListingCard";
import { useUI } from "../../context/UIContext";
import { listingsApi } from "../../services/listingsApi";
import SEO from "../../components/seo/SEO";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { isMobile } = useUI();
  const [listings, setListings] = useState([]);
  const [sponsoredAds, setSponsoredAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const [listingsRes, adsRes] = await Promise.all([
          listingsApi.getListings({ limit: 12 }),
          import("../../services/adsApi").then((m) =>
            m.adsApi.getSponsoredAds().catch(() => null),
          ),
        ]);

        setListings(listingsRes.data.data || []);
        if (adsRes && adsRes.data && adsRes.data.data) {
          setSponsoredAds(adsRes.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch listings", err);
        setError("Failed to load listings. Check backend connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const renderSkeletons = () => (
    <div className="listings-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  return (
    <div className="home-container">
      <SEO
        title="RwanMart | Buy & Sell Online in Rwanda"
        description="RwanMart is an online marketplace in Rwanda where people can buy and sell products and discover local sellers."
        canonicalUrl="/"
        schemaList={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": "https://rwanmart.com/#website",
            name: "RwanMart",
            url: "https://rwanmart.com/",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://rwanmart.com/browse?search={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": "https://rwanmart.com/#organization",
            name: "RwanMart",
            url: "https://rwanmart.com/",
            logo: "https://rwanmart.com/favicon.png",
          },
        ]}
      />
      <div className="home-hero-section">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-hero-eyebrow">WELCOME TO RWANMART</span>
            <h1 className="home-hero-title">
              Buy and sell
              <br />
              <em>easier than ever.</em>
            </h1>
            <p className="home-hero-subtitle">
              Browse products from sellers across Rwanda, or put your own item
              in front of local buyers.
            </p>
            <div className="home-hero-actions">
              <button
                onClick={() => navigate("/create-listing")}
                className="home-hero-primary"
              >
                <Tag size={15} /> Start selling
              </button>
              <button
                onClick={() => navigate("/browse")}
                className="home-hero-secondary"
              >
                Browse products <ArrowRight size={16} />
              </button>
            </div>
          </div>
          {!isMobile && (
            <div className="home-hero-panel" aria-label="Marketplace shortcuts">
              <span className="home-hero-panel-label">
                What are you here to do?
              </span>
              <button
                onClick={() => navigate("/browse")}
                className="home-hero-panel-link"
              >
                <ShoppingBag size={17} />
                <span>
                  <strong>Find something</strong>
                  <small>Browse the latest listings</small>
                </span>
                <ArrowRight size={15} />
              </button>
              <button
                onClick={() => navigate("/create-listing")}
                className="home-hero-panel-link"
              >
                <Tag size={17} />
                <span>
                  <strong>Sell something</strong>
                  <small>Reach buyers in Rwanda</small>
                </span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Recent Listings</h2>
          <button onClick={() => navigate("/browse")} className="section-link">
            See all <ArrowRight size={14} />
          </button>
        </div>

        {error ? (
          <div className="home-listings-state home-listings-state--error">
            {error}
          </div>
        ) : loading ? (
          renderSkeletons()
        ) : (
          <>
            {sponsoredAds.length > 0 && (
              <div
                className="sponsored-ads-section"
                style={{ marginBottom: "2rem" }}
              >
                <h3
                  style={{
                    fontSize: "1.25rem",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--color-ink-900)",
                  }}
                >
                  <TrendingUp size={18} color="var(--color-brand-500)" />{" "}
                  Sponsored
                </h3>
                <div className="listings-grid">
                  {sponsoredAds.map((ad) => (
                    <div
                      key={ad.id}
                      className="sponsored-ad-card"
                      style={{
                        cursor: "pointer",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "1px solid var(--color-ink-200)",
                      }}
                      onClick={() =>
                        ad.listing_id && navigate(`/listing/${ad.listing_id}`)
                      }
                    >
                      <div
                        style={{
                          aspectRatio: "1/1",
                          background: "var(--color-ink-100)",
                        }}
                      >
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <div style={{ padding: "0.75rem" }}>
                        <h4
                          style={{
                            margin: "0 0 0.25rem 0",
                            fontSize: "0.9rem",
                            color: "var(--color-ink-900)",
                          }}
                        >
                          {ad.title}
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8rem",
                            color: "var(--color-ink-500)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {ad.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="listings-grid">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} compact={isMobile} />
              ))}
            </div>

            {listings.length === 0 && (
              <div className="home-listings-state home-listings-state--empty">
                No listings available right now.
              </div>
            )}
          </>
        )}

        <div className="home-browse-more">
          <button
            onClick={() => navigate("/browse")}
            className="home-browse-more__button"
          >
            Browse more listings
          </button>
        </div>

        <div className="sell-cta-banner">
          <div className="sell-cta-content">
            <h3 className="sell-cta-title">Have something to sell?</h3>
            <p className="sell-cta-subtitle">
              Post your first 2 listings for free. No subscription needed.
            </p>
            <button
              onClick={() => navigate("/create-listing")}
              className="sell-cta-btn"
            >
              Start selling
            </button>
          </div>
          <div className="sell-cta-image-wrap">
            <img
              src="/images/ctaimage.jpg"
              alt="People connecting through an online marketplace"
              className="sell-cta-image"
            />
          </div>
        </div>

        <div
          className="home-seo-entity-block"
          style={{
            padding: "2rem 1rem",
            background: "var(--color-ink-50)",
            borderRadius: "12px",
            marginTop: "2rem",
            textAlign: "left",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              marginBottom: "0.75rem",
              color: "var(--color-ink-900)",
            }}
          >
            About RwanMart
          </h2>
          <p
            style={{
              color: "var(--color-ink-600)",
              lineHeight: "1.6",
              fontSize: "0.9rem",
              margin: 0,
            }}
          >
            <strong>RwanMart</strong> is Rwanda's online marketplace for
            discovering products from local sellers. Browse mobile phones,
            laptops, electronics, cars, property, and home essentials, or
            create a listing to reach buyers across the country. Shop locally,
            connect directly, and find your next great deal in Rwanda.
          </p>
        </div>
      </div>
    </div>
  );
}

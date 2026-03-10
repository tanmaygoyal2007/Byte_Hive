"use client"

import type { Canteen } from "./canteens"

export function CanteenCard({ id, name, cuisine, rating, location, image }: Canteen) {
    return (
        <a href={`/canteens/${id}`} className="card-link">
            <article className="card-wrap">
                {/* Image Wrapper */}
                <div className="card-image-container">
                    <img
                        src={image || "/placeholder.svg"}
                        alt={name}
                        className="card-img"
                    />
                </div>

                {/* Content Wrapper */}
                <div className="card-body">
                    <h3 className="card-name">{name}</h3>
                    <p className="card-cuisine">{cuisine}</p>

                    {/* Footer (Rating & Location) */}
                    <div className="card-footer">
                        <div className="card-rating">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="card-star-icon">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span className="card-rating-text">{rating}</span>
                        </div>

                        <div className="card-location">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-location-icon">
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="card-location-text">{location}</span>
                        </div>
                    </div>
                </div>
            </article>
        </a>
    );
}

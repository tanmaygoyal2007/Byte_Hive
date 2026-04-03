import "./ImageGallery.css";

function ImageGallery({ canteen }: { canteen?: any }) {
    const galleryImages = canteen?.images?.slice(1, 4) ?? [];
    const heroImage = galleryImages[0] ?? "/images/CANTEEN1.jpg";
    const sideImages = galleryImages.slice(1);

    return (
        <div className="image-gallery">
            <div className="gallery-left">
                <img src={heroImage} alt={canteen?.name ?? 'Canteen'} />
            </div>

            <div className="gallery-right">
                {sideImages.map((image: string, index: number) => (
                    <div key={image} className="small-img">
                        <img src={image} alt={`${canteen?.name ?? "Canteen"} preview ${index + 2}`} />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ImageGallery;

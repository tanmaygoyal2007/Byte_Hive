import "./ImageGallery.css";

function ImageGallery({ canteen }: { canteen?: any }) {
    // For now we show three fixed header images from public/images
    // Files: CANTEEN1.jpg, CANTEEN2.jpg, CANTEEN3.jpg
    return (
        <div className="image-gallery">
            <div className="gallery-left">
                <img src="/images/CANTEEN1.jpg" alt={canteen?.name ?? 'Canteen'} />
            </div>

            {/* <div className="gallery-right">
                <div className="small-img">
                    <img src="/images/CANTEEN2.jpg" alt="Canteen 2" />
                </div>
                <div className="small-img">
                    <img src="/images/CANTEEN3.jpg" alt="Canteen 3" />
                </div>
            </div> */}
        </div>
    )
}

export default ImageGallery;
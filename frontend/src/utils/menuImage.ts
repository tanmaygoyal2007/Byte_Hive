export function resolveMenuImageUrl(image?: string) {
  if (!image) return "";

  // Support pasted Google Images result links by extracting the real image URL.
  if (image.includes("google.com/imgres")) {
    try {
      const url = new URL(image);
      const actual = url.searchParams.get("imgurl");
      if (actual) return decodeURIComponent(actual);
    } catch {
      return image;
    }
  }

  return image;
}

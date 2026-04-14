export function resolveMenuImageUrl(image?: string) {
  if (!image) return "";

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

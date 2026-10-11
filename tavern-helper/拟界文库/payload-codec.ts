type OnlinePackedPayload = { format: 'loreframe-assets-v1'; prefix: string; json: string; images: string[]; texts?: string[] };
// Deduplicate embedded image bytes across page mirrors, candidates and image history.
// Only the IndexedDB representation changes; export and in-memory HTML remain self-contained.
function packOnlinePayload(data: unknown): OnlinePackedPayload {
  const original = JSON.stringify(data ?? null);
  let prefix = '__LOREFRAME_IMAGE_';
  while (original.includes(prefix)) prefix += '_';
  const images: string[] = [];
  const indices = new Map<string, number>();
  const image_json = original.replace(/data:image\/[a-z0-9.+-]+;base64,[a-zA-Z0-9+/=]+/g, image => {
    let index = indices.get(image);
    if (index === undefined) {
      index = images.length;
      indices.set(image, index);
      images.push(image);
    }
    return `${prefix}${index}__`;
  });
  const texts: string[] = [];
  const text_indices = new Map<string, number>();
  const json = image_json.replace(/"(?:\\.|[^"\\])*"/g, token => {
    if (token.length < 256) return token;
    let index = text_indices.get(token);
    if (index === undefined) { index = texts.length; text_indices.set(token, index); texts.push(token); }
    return JSON.stringify(`${prefix}TEXT_${index}__`);
  });
  return { format: 'loreframe-assets-v1', prefix, json, images, texts };
}
function unpackOnlinePayload(packed: OnlinePackedPayload): OnlineData {
  if (
    packed.format !== 'loreframe-assets-v1' ||
    !/^__LOREFRAME_IMAGE_+$/.test(packed.prefix) ||
    !Array.isArray(packed.images)
  )
    throw Error('无法识别的页面存储格式');
  const expanded = packed.json.replace(new RegExp(`"${packed.prefix}TEXT_(\\d+)__"`, 'g'), (_, index) => {
    const token = packed.texts?.[Number(index)];
    if (typeof token !== 'string' || typeof JSON.parse(token) !== 'string') throw Error('页面正文资源缺失');
    return token;
  });
  const json = expanded.replace(new RegExp(`${packed.prefix}(\\d+)__`, 'g'), (_, index) => {
    const image = packed.images[Number(index)];
    if (typeof image !== 'string' || !/^data:image\/[a-z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/.test(image))
      throw Error('页面图片资源缺失');
    return image;
  });
  return JSON.parse(json) as OnlineData;
}

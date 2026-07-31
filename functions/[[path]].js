export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  if (pathSegments.length >= 3) {
    const cityId = pathSegments[2]; 

    const { results } = await context.env.DB.prepare(
      "SELECT * FROM cities WHERE id = ? LIMIT 1"
    ).bind(cityId).all();

    if (!results || results.length === 0) {
      return context.env.ASSETS.fetch(context.request);
    }

    const city = results[0];
    const pageResponse = await context.env.ASSETS.fetch(new URL('/forecast.html', url.origin));

    return new HTMLRewriter()
      .on('title', {
        element(el) {
          el.setInnerContent(`${city.city_name} Weather Forecast | Live Update`);
        }
      })
      .on('head', {
        element(el) {
          el.append(`<script>window.ACTIVE_CITY = ${JSON.stringify(city)};</script>`, { html: true });
        }
      })
      .transform(pageResponse);
  }

  return context.env.ASSETS.fetch(context.request);
}

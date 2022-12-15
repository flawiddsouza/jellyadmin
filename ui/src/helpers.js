export function addQueryParamsToRoute(route, params) {
    window.history.pushState(
      {},
      null,
      route.path +
        '?' +
        Object.keys(params)
        .map(key => {
            return (
                encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
            )
        })
        .join('&')
    )
}

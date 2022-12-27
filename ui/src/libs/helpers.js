export function addQueryParamsToRoute(route, params) {
    const newParams = {
        ...route.query,
        ...params
    }

    window.history.pushState(
      {},
      null,
      route.path +
        '?' +
        Object.keys(newParams)
        .map(key => {
            return (
                encodeURIComponent(key) + '=' + encodeURIComponent(newParams[key])
            )
        })
        .join('&')
    )
}

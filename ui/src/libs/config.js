const localStorageKey = 'JellyAdmin-Config'

export function getAll() {
    const config = localStorage.getItem(localStorageKey)

    if(!config) {
        return {}
    }

    return JSON.parse(config)
}

export function get(key, defaultValue) {
    const config = getAll()

    if(key in config) {
        return config[key]
    }

    if(defaultValue !== undefined) {
        return defaultValue
    }

    return undefined
}

export function set(key, value) {
    const config = getAll()

    config[key] = value

    localStorage.setItem(localStorageKey, JSON.stringify(config))
}

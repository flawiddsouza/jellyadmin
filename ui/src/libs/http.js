export const http = {
    async get(url, abortControllerSignal=null) {
        const response = await fetch(url, {
            signal: abortControllerSignal
        })
        if(response.status !== 400) {
            return {
                success: true,
                data: await response.json()
            }
        } else {
            return {
                success: false,
                data: await response.text()
            }
        }
    },

    async post(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if(response.status !== 400) {
            return {
                success: true,
                data: await response.json()
            }
        } else {
            return {
                success: false,
                data: await response.text()
            }
        }
    },

    async put(url, body) {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if(response.status !== 400) {
            return {
                success: true,
                data: await response.json()
            }
        } else {
            return {
                success: false,
                data: await response.text()
            }
        }
    },

    async delete(url) {
        const response = await fetch(url, {
            method: 'DELETE'
        })

        if(response.status !== 400) {
            return {
                success: true,
                data: await response.json()
            }
        } else {
            return {
                success: false,
                data: await response.text()
            }
        }
    }
}

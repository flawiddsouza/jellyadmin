import { defineStore } from 'pinia'
import * as api from './libs/api.js'

export const useStore = defineStore('store', {
    state: () => {
        return {
            currentConnection: null,
            savedQueries: [],
            selectedSavedQuery: null,
        }
    },
    actions: {
        async loadSavedQueries() {
            const { data } = await api.getSavedQueries(this.currentConnection.id)
            this.savedQueries = data
            if(this.savedQueries.length > 0) {
                this.selectedSavedQuery = this.savedQueries[0]
            } else {
                this.selectedSavedQuery = null
            }
        },
        async addSavedQuery(query) {
            const { data: savedQuery } = await api.addSavedQuery(this.currentConnection.id, query.name, query.query)
            this.savedQueries.push(savedQuery)
            this.selectedSavedQuery = savedQuery
        },
        async deleteSavedQuery(id) {
            await api.deleteSavedQuery(id)
            const deleteIndex = this.savedQueries.findIndex(query => query.id === id)
            const switchTo = deleteIndex === 0 ? 0 : deleteIndex - 1
            this.savedQueries.splice(deleteIndex, 1)
            if (this.savedQueries.length === 0) {
                this.selectedSavedQuery = null
            } else {
                this.selectedSavedQuery = this.savedQueries[switchTo]
            }
        },
    }
})

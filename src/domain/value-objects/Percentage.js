class Percentage {
    constructor(value) {
        this.value = Number(value || 0);

        if (Number.isNaN(this.value)) {
            throw new Error('INVALID_PERCENTAGE_VALUE');
        }
    }

    toRate() {
        return this.value > 1 ? this.value / 100 : this.value;
    }
}

module.exports = {
    Percentage
};

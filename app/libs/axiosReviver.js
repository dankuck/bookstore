import axios from 'axios';

export default axiosRevive {

    addToReviver(reviver) {
        reviver.addMatch(
            'axios',
            (value) => value === axios,
            () => axios,
            () => '__AXIOS__',
        );
    },
};

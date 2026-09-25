import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        // Allow ngrok tunnels (any subdomain) and the current free domain.
        // A leading dot means "match this domain and any subdomain of it".
        allowedHosts: [
            '.ngrok-free.dev',
            '.ngrok-free.app',
            '.ngrok.io',
            '.ngrok.app'
        ]
    }
});

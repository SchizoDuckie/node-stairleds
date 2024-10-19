import express from 'express';
import mdnsDiscoveryService from '../services/MdnsDiscoveryService.js';

const router = express.Router();

/**
 * API endpoint to get discovered mDNS devices
 */
router.get('/mdns-discovery', (req, res) => {
    const discoveredDevices = mdnsDiscoveryService.getDiscoveredDevices();
    res.json(discoveredDevices);
});

export default router;

// Quiz questions for the "IP addresses and subnets" lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'subnet', q: 'In the notation 192.168.0.10/24, what does /24 mean?',
    a: ['The first 24 bits of the address are the network part', 'The network can hold up to 24 devices', 'The last 24 bits of the address are the network part', 'You connect to port 24 of this address'],
    why: 'The number in CIDR notation says how many of the 32 bits, counted from the front, make up the network part. With /24, the first 24 bits are the network part and the remaining 8 bits are the host part. It means the same as the subnet mask 255.255.255.0.' },
  { lv: 2, id: 'subnet', q: 'A /24 network has 256 addresses, so why can only 254 of them be given to devices?',
    a: ['The network address (host part all 0) and the broadcast address (host part all 1) are not given to devices', 'The first and second addresses are always reserved for the router and the DNS server', 'The numbers 0 and 255 cannot be represented in 8 bits, so they cannot be used in an address', 'The standard sets 2 addresses aside as a private address range'],
    why: 'The address whose host part is all 0 points to the network itself, and the address whose host part is all 1 is used for the broadcast that goes to every device on that network. Subtracting these two from 2 to the power of 8, which is 256, leaves 254. A gateway using the first address is only a common convention, not a rule.',
    sim: { c: { ip: '192.168.0.10', prefix: '24', dest: '192.168.0.200' }, col: 2, has: '254' } },
  { lv: 3, id: 'subnet', q: 'The address of my PC is 192.168.0.10/25. What happens when I send data to 192.168.0.200?',
    a: ['It is judged to be on a different network and is sent to the default gateway', 'The first three numbers are the same, so it is treated as the same network and sent directly', 'Private addresses cannot talk to each other, so it cannot be sent', 'It is the broadcast address, so it is sent to all devices'],
    why: 'With /25, the first 25 bits are the network part, so 192.168.0.0 through 192.168.0.127 is one network, and 192.168.0.128 through 192.168.0.255 is another network. The 10 and the 200 are on different sides, so my PC hands the delivery to the default gateway.',
    sim: { c: { ip: '192.168.0.10', prefix: '25', dest: '192.168.0.200' }, col: 3, has: 'Different network' } },
  { lv: 2, id: 'subnet', q: 'Why can several devices in a home use the internet at the same time through a single public IP address?',
    a: ['The router replaces the source address and port of outgoing packets, records the pair, and uses it to send each response back to the original device', 'The router gets a different public address for each device from the ISP and hands them out', 'A private address is unique in the whole world, so servers on the internet can respond to a private address directly', 'A server on the internet sends the response back by looking at the MAC address of the device that sent the request'],
    why: 'With NAT, the router replaces the private source address and port with its own public address and a new port, and records the pair in the translation table. When a response comes back, it uses the port number to find which device it belongs to and sends it back. Private addresses are reused in many places, so they do not work on the internet.',
    sim: { c: { ip: '192.168.0.10', prefix: '24', dest: '203.0.113.7' }, col: 4, has: 'NAT' } },
]);

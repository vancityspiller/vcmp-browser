import { http } from '@tauri-apps/api';
import React, { useState, useEffect } from 'react';
import { Button, Input, Modal } from 'rsuite';

// --------------------------------------------------------- //

function AddFav({setFavorites}) {

    const matchIpPort = new RegExp(/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/);
    const matchHostPort = new RegExp(/^.*:[0-9]+$/);

    const [open, setOpen] = useState(false);
    const [ip, setIp] = useState(''); 

    const [processingIp, setProcessingIp] = useState(false);
    const [processingFailed, setProcessingFailed] = useState(false);
    const [procError, setProcError] = useState('');
    const [addEnabled, setAddEnabled] = useState(false);

    // --------------------------------------------------------- //

    const handleClose = () => {
        setIp('');
        setProcessingFailed(false);
        setProcessingIp(false);
        setOpen(false);
    }

    const handleChange = (value) => {
        value = value.trim();

        setAddEnabled(matchHostPort.test(value));
        setProcessingFailed(false);
        setProcError('');

        setIp(value);
    }

    // --------------------------------------------------------- //

    const handleAdd = () => {

        let p_ip = ip;
        const [hostName, hostPort] = ip.split(':');
        
        if(hostName.toLowerCase() === 'localhost') {
            p_ip = '127.0.0.1:' + hostPort;
        }

        if(matchIpPort.test(p_ip)) {

            const [s_ip, s_port] = p_ip.split(':');
            let failed = false;

            setFavorites(p => {
                if(p.findIndex(v => {
                    return (v.ip === s_ip && v.port === parseInt(s_port));
                }) === -1 ) {
                    return [...p, {ip: s_ip, port: parseInt(s_port), addedAt: Date.now()}];
                } else {

                    failed = true;
                    setProcessingFailed(true);
                    setProcError('Server already exists in favorites!')
                    return p;
                }
            });

            if(!failed) handleClose();
        } else {

            setProcessingIp(true);
            setAddEnabled(false);
        }
    }

    // --------------------------------------------------------- //

    useEffect(() => {

        const add = async () => {
            
            if(processingIp === false) return;

            try {
                // use Google's public DNS to resolve the hostname
                const resolved = await http.fetch(`https://dns.google.com/resolve?name=${ip.split(':')[0]}`);

                if(resolved.data.Answer[0].type !== 1) {
                    setProcessingFailed(true);
                    setProcessingIp(false);

                } else {

                    const [, port] = ip.split(':');
                    const s_ip = resolved.data.Answer[0].data, s_port = parseInt(port);

                    let failed = false;

                    await setFavorites(p => {
                        if(p.findIndex(v => {
                            return (v.ip === s_ip && v.port === s_port);
                        }) === -1 ) {
                            return [...p, {ip: s_ip, port: s_port, addedAt: Date.now()}];
                        } else {

                            failed = true;
                            setProcessingFailed(true);
                            setProcessingIp(false);
                            setProcError('Server already exists in favorites!')
                            return p;
                        }
                    });

                    if(!failed) {
                        setProcessingIp(false);
                        handleClose();
                    }
                }

            } catch (error) {
                setProcError('Could not resolve hostname!');
                setProcessingFailed(true);
                setProcessingIp(false);
            }
        }

        add();

    }, [processingIp]);

    // --------------------------------------------------------- //

    return (
        <React.Fragment>
            <Button onClick={() => setOpen(true)} className='srvAddButton' appearance='primary' size='sm'>
                Add Favorite
            </Button>

            <Modal
                backdrop='static'
                open={open}
                onClose={handleClose}
                keyboard={false}
            >

                <Modal.Header closeButton={false}>
                    <Modal.Title>Add Favorite</Modal.Title>
                </Modal.Header>

                <Modal.Body>

                    <Input
                        autoFocus
                        placeholder='ip:port'
                        onChange={handleChange}
                        value={ip}
                        disabled={processingIp}
                        onPressEnter={() => {
                            if(addEnabled) handleAdd();
                        }}
                    />
                </Modal.Body>

                <Modal.Footer>
                    <span className='srvAddError'>{processingFailed ? `ERROR: ${procError}` : ''}</span>

                    <Button 
                        onClick={handleAdd} 
                        appearance='primary'
                        disabled={!addEnabled}
                        loading={processingIp}
                    >
                        Add
                    </Button>

                    <Button 
                        onClick={handleClose}
                        disabled={processingIp}
                    >
                        Cancel
                    </Button>
                </Modal.Footer>

            </Modal>
        </React.Fragment>
    );
}

export default AddFav;
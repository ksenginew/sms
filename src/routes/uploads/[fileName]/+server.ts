import { error } from '@sveltejs/kit';
import { open } from 'node:fs/promises';
import { statSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
    const filePath = "." + event.url.pathname;

    if (!existsSync(filePath)) {
        throw error(404, 'File not found');
    }

    try {
        const stats = statSync(filePath);
        const contentType = 'application/octet-stream';

        const file = await open(filePath);
        const stream = file.readableWebStream();

        return new Response(stream as BodyInit, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
                'Content-Disposition': `attachment; filename="${event.params.fileName}"`,
            }
        });
    } catch (e) {
        console.error(e);
        throw error(500, 'Error streaming file');
    }
};
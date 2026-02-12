import { bindServices } from '@rabjs/react';
import { GalleryPage } from './gallery';
import { AttachmentService } from '../../services/attachment.service';

const GalleryPageWithServices = bindServices(GalleryPage, [AttachmentService]);

export default GalleryPageWithServices;

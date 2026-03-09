import { bindServices } from '@rabjs/react';
import { TrashPage } from './trash';
import { TrashService } from '../../services/trash.service';

const TrashPageWithServices = bindServices(TrashPage, [TrashService]);

export default TrashPageWithServices;

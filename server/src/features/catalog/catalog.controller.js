import * as service from './catalog.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export const listCategories = catchAsync(async (req, res) => sendSuccess(res, 200, { categories: await service.listCategories() }));
export const createCategory = catchAsync(async (req, res) => sendSuccess(res, 201, { category: await service.createCategory(req.body || {}) }));
export const updateCategory = catchAsync(async (req, res) => sendSuccess(res, 200, { category: await service.updateCategory(req.params.id, req.body || {}) }));
export const reorderCategories = catchAsync(async (req, res) => {
  await service.reorderCategories((req.body || {}).ids);
  sendSuccess(res, 200, { categories: await service.listCategories() });
});
export const deleteCategory = catchAsync(async (req, res) => {
  await service.deleteCategory(req.params.id);
  sendSuccess(res, 200, { deleted: true });
});

export const createItem = catchAsync(async (req, res) => sendSuccess(res, 201, { item: await service.createItem(req.body) }));
export const updateItem = catchAsync(async (req, res) => sendSuccess(res, 200, { item: await service.updateItem(req.params.id, req.body) }));
export const deleteItem = catchAsync(async (req, res) => {
  await service.deleteItem(req.params.id);
  sendSuccess(res, 200, { deleted: true });
});

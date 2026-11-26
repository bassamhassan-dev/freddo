import * as service from './barista.service.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const listItems = catchAsync(async (req, res) => {
  const items = await service.listWorkspaceItems();
  res.json({ success: true, data: { items } });
});

export const getRecipe = catchAsync(async (req, res) => {
  const data = await service.getRecipeBySlug(req.params.slug);
  res.json({ success: true, data });
});

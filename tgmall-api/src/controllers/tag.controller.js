import * as tagService from '../services/tag.service.js';

export async function list(req, res, next) {
  try { const data = await tagService.listTags(req.query); res.json({ success: true, data }); } catch (err) { next(err); }
}
export async function create(req, res, next) {
  try { const data = await tagService.createTag(req.body); res.status(201).json({ success: true, data }); } catch (err) { next(err); }
}
export async function update(req, res, next) {
  try { const data = await tagService.updateTag(req.params.id, req.body); res.json({ success: true, data }); } catch (err) { next(err); }
}
export async function remove(req, res, next) {
  try { await tagService.deleteTag(req.params.id); res.json({ success: true }); } catch (err) { next(err); }
}

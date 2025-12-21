import type { UmaValueRepository } from "./repository";
import type {
	UmaValueCreateInput,
	UmaValueFilters,
	UmaValuePatchInput,
	UmaValueUpdateInput,
} from "./schemas";
import type { UmaValueEntity, ListResult } from "./types";

export class UmaValueService {
	constructor(private readonly repository: UmaValueRepository) {}

	list(filters: UmaValueFilters): Promise<ListResult<UmaValueEntity>> {
		return this.repository.list(filters);
	}

	async get(id: string): Promise<UmaValueEntity> {
		const umaValue = await this.repository.getById(id);
		if (!umaValue) {
			throw new Error("UMA_VALUE_NOT_FOUND");
		}
		return umaValue;
	}

	async getByYear(year: number): Promise<UmaValueEntity | null> {
		return this.repository.getByYear(year);
	}

	async getActive(): Promise<UmaValueEntity | null> {
		return this.repository.getActive();
	}

	create(input: UmaValueCreateInput): Promise<UmaValueEntity> {
		return this.repository.create(input);
	}

	update(id: string, input: UmaValueUpdateInput): Promise<UmaValueEntity> {
		return this.repository.update(id, input);
	}

	patch(id: string, input: UmaValuePatchInput): Promise<UmaValueEntity> {
		return this.repository.patch(id, input);
	}

	delete(id: string): Promise<void> {
		return this.repository.delete(id);
	}

	activate(id: string): Promise<UmaValueEntity> {
		return this.repository.activate(id);
	}
}
